// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal surface of USDC used here: the ERC-20 interface plus EIP-3009.
/// On Arc, 0x3600000000000000000000000000000000000000 is the ERC-20 interface of the
/// native USDC balance (6 decimals). The same balance pays gas.
interface IUSDC {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/// @title Ajo — rotating savings circles in USDC
/// @notice An ajo (esusu, susu, chama, tontine) is a group of people who each pay the same
/// amount every round; each round the whole pot goes to one member, in turn, until everyone
/// has received it once. This contract runs that circle on Arc:
///  - members hold only USDC: it is the savings asset AND the gas asset;
///  - every action has a gasless twin that takes an EIP-3009 signature, so a relayer can
///    submit it and be repaid a capped fee in the same asset (USDC), from the signed amount;
///  - the pot is paid the moment the last member contributes (sub-second finality);
///  - a security deposit covers a missed round, so one late member never blocks the circle,
///    and comes back automatically when the circle completes;
///  - every member builds an on-chain savings record (rounds paid vs. rounds missed).
contract Ajo {
    // ----------------------------------------------------------------- types
    enum Status {
        Open, // filling up
        Active, // running rounds
        Completed // everyone received the pot once
    }

    struct Circle {
        string name;
        address organizer;
        uint128 contribution; // per member per round, USDC 6-dec units
        uint128 deposit; // security deposit per member, USDC 6-dec units
        uint64 roundDuration; // seconds a round stays open before it can be settled
        uint64 deadline; // current round's deadline (Active only)
        uint64 createdAt;
        uint16 size; // members needed
        uint16 round; // current round index; == size when Completed
        uint16 paidCount; // contributions received in the current round
        Status status;
        uint256 pot; // collected in the current round
    }

    struct Record {
        uint32 paid; // contributions made (any route)
        uint32 missed; // rounds settled from the deposit
        uint32 received; // pots received
        uint32 circlesCompleted;
    }

    // -------------------------------------------------------------- constants
    uint16 public constant MIN_MEMBERS = 2;
    uint16 public constant MAX_MEMBERS = 20;
    bytes32 public constant JOIN = keccak256("AJO_JOIN");
    bytes32 public constant CONTRIBUTE = keccak256("AJO_CONTRIBUTE");

    IUSDC public immutable usdc;
    /// @notice Most a relayer may keep from one signed amount (USDC 6-dec units).
    uint256 public immutable maxRelayFee;

    // ------------------------------------------------------------------ state
    uint256 public circleCount;
    mapping(uint256 => Circle) internal _circles;
    mapping(uint256 => address[]) internal _members;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => mapping(address => uint256)) public depositOf;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaid; // id => round => member
    mapping(address => Record) public records;
    /// @notice Payouts that could not be pushed (e.g. a blocklisted recipient) wait here.
    mapping(address => uint256) public owed;

    // ----------------------------------------------------------------- events
    event CircleCreated(
        uint256 indexed id,
        address indexed organizer,
        string name,
        uint256 contribution,
        uint256 deposit,
        uint16 size,
        uint64 roundDuration
    );
    event Joined(uint256 indexed id, address indexed member, uint16 slot, address relayer, uint256 relayFee);
    event Left(uint256 indexed id, address indexed member);
    event CircleStarted(uint256 indexed id, uint64 deadline);
    event Contributed(
        uint256 indexed id, uint16 indexed round, address indexed member, uint256 amount, address relayer, uint256 relayFee
    );
    event Defaulted(uint256 indexed id, uint16 indexed round, address indexed member, uint256 coveredFromDeposit);
    event PotPaid(uint256 indexed id, uint16 indexed round, address indexed recipient, uint256 amount, bool pushed);
    event CircleCompleted(uint256 indexed id);
    event DepositReturned(uint256 indexed id, address indexed member, uint256 amount, bool pushed);
    event OwedWithdrawn(address indexed account, uint256 amount);

    // ----------------------------------------------------------------- errors
    error BadParams();
    error NotOpen();
    error NotActive();
        error AlreadyMember();
    error NotAMember();
    error AlreadyPaid();
    error RoundStillOpen();
    error BadAmount();
    error NothingToClaim();
    error TransferFailed();

    uint256 private _lock = 1;

    modifier nonReentrant() {
        require(_lock == 1, "reentrant");
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(IUSDC usdc_, uint256 maxRelayFee_) {
        usdc = usdc_;
        maxRelayFee = maxRelayFee_;
    }

    // ------------------------------------------------------------- organize
    /// @notice Start a new circle. The organizer gets no special powers; anyone can organize,
    /// including a relayer acting for someone with no gas.
    function createCircle(
        string calldata name,
        uint128 contribution,
        uint128 deposit,
        uint16 size,
        uint64 roundDuration
    ) external returns (uint256 id) {
        if (
            contribution == 0 || size < MIN_MEMBERS || size > MAX_MEMBERS || roundDuration < 60
                || roundDuration > 90 days || bytes(name).length == 0 || bytes(name).length > 64
        ) revert BadParams();
        id = ++circleCount;
        Circle storage c = _circles[id];
        c.name = name;
        c.organizer = msg.sender;
        c.contribution = contribution;
        c.deposit = deposit;
        c.size = size;
        c.roundDuration = roundDuration;
        c.createdAt = uint64(block.timestamp);
        emit CircleCreated(id, msg.sender, name, contribution, deposit, size, roundDuration);
    }

    // ------------------------------------------------------------------ join
    /// @notice Join with an ERC-20 approval (member pays gas).
    function join(uint256 id) external nonReentrant {
        Circle storage c = _circles[id];
        _checkJoin(c, id, msg.sender);
        if (c.deposit > 0) _pull(msg.sender, c.deposit);
        _join(c, id, msg.sender, address(0), 0);
    }

    /// @notice Gasless join: `member` signed an EIP-3009 authorization paying `value`
    /// (= deposit + relay fee) to this contract. The nonce binds the signature to this
    /// circle, so it cannot be replayed into a different one.
    function joinWithAuthorization(
        uint256 id,
        address member,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 salt,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        Circle storage c = _circles[id];
        _checkJoin(c, id, member);
        uint256 fee = _receiveSigned(member, value, c.deposit, validAfter, validBefore, joinNonce(id, member, salt), v, r, s);
        _join(c, id, member, msg.sender, fee);
    }

    /// @notice Leave a circle that has not started yet; the deposit comes back.
    function leave(uint256 id) external nonReentrant {
        Circle storage c = _circles[id];
        if (c.status != Status.Open) revert NotOpen();
        if (!isMember[id][msg.sender]) revert NotAMember();
        address[] storage m = _members[id];
        uint256 n = m.length;
        for (uint256 i; i < n; ++i) {
            if (m[i] == msg.sender) {
                for (uint256 j = i; j + 1 < n; ++j) m[j] = m[j + 1]; // keep slot order
                m.pop();
                break;
            }
        }
        isMember[id][msg.sender] = false;
        uint256 dep = depositOf[id][msg.sender];
        depositOf[id][msg.sender] = 0;
        if (dep > 0) _push(msg.sender, dep);
        emit Left(id, msg.sender);
    }

    // ------------------------------------------------------------ contribute
    /// @notice Pay this round's contribution with an ERC-20 approval (member pays gas).
    function contribute(uint256 id) external nonReentrant {
        Circle storage c = _circles[id];
        _checkContribute(c, id, msg.sender);
        _pull(msg.sender, c.contribution);
        _contribute(c, id, msg.sender, address(0), 0);
    }

    /// @notice Gasless contribution: `member` signed an EIP-3009 authorization paying `value`
    /// (= contribution + relay fee). The nonce binds it to this circle and this round.
    function contributeWithAuthorization(
        uint256 id,
        address member,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 salt,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        Circle storage c = _circles[id];
        _checkContribute(c, id, member);
        uint256 fee = _receiveSigned(
            member, value, c.contribution, validAfter, validBefore, contributeNonce(id, c.round, member, salt), v, r, s
        );
        _contribute(c, id, member, msg.sender, fee);
    }

    /// @notice After the deadline anyone can close the round: each unpaid member's share is
    /// taken from their deposit (as far as it goes) and the pot is paid out.
    function settle(uint256 id) external nonReentrant {
        Circle storage c = _circles[id];
        if (c.status != Status.Active) revert NotActive();
        if (block.timestamp <= c.deadline) revert RoundStillOpen();
        uint16 round = c.round;
        address[] storage m = _members[id];
        for (uint256 i; i < m.length; ++i) {
            address who = m[i];
            if (hasPaid[id][round][who]) continue;
            uint256 dep = depositOf[id][who];
            uint256 cover = dep < c.contribution ? dep : c.contribution;
            depositOf[id][who] = dep - cover;
            c.pot += cover;
            hasPaid[id][round][who] = true;
            records[who].missed += 1;
            emit Defaulted(id, round, who, cover);
        }
        _payout(c, id);
    }

    // ---------------------------------------------------------------- claims
    function withdrawOwed() external nonReentrant {
        uint256 amt = owed[msg.sender];
        if (amt == 0) revert NothingToClaim();
        owed[msg.sender] = 0;
        if (!usdc.transfer(msg.sender, amt)) revert TransferFailed();
        emit OwedWithdrawn(msg.sender, amt);
    }

    // ----------------------------------------------------------------- views
    function joinNonce(uint256 id, address member, bytes32 salt) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), JOIN, id, member, salt));
    }

    function contributeNonce(uint256 id, uint16 round, address member, bytes32 salt) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), CONTRIBUTE, id, round, member, salt));
    }

    function getCircle(uint256 id)
        external
        view
        returns (Circle memory circle, address[] memory members, bool[] memory paidThisRound, uint256[] memory deposits)
    {
        circle = _circles[id];
        members = _members[id];
        paidThisRound = new bool[](members.length);
        deposits = new uint256[](members.length);
        for (uint256 i; i < members.length; ++i) {
            paidThisRound[i] = hasPaid[id][circle.round][members[i]];
            deposits[i] = depositOf[id][members[i]];
        }
    }

    function recipientOf(uint256 id, uint16 round) external view returns (address) {
        return _members[id][round];
    }

    // -------------------------------------------------------------- internal
    function _checkJoin(Circle storage c, uint256 id, address member) internal view {
        if (c.size == 0 || c.status != Status.Open) revert NotOpen();
        if (isMember[id][member]) revert AlreadyMember();
    }

    function _join(Circle storage c, uint256 id, address member, address relayer, uint256 fee) internal {
        _members[id].push(member);
        isMember[id][member] = true;
        depositOf[id][member] = c.deposit;
        uint16 slot = uint16(_members[id].length - 1);
        emit Joined(id, member, slot, relayer, fee);
        if (_members[id].length == c.size) {
            c.status = Status.Active;
            c.deadline = uint64(block.timestamp) + c.roundDuration;
            emit CircleStarted(id, c.deadline);
        }
    }

    function _checkContribute(Circle storage c, uint256 id, address member) internal view {
        if (c.status != Status.Active) revert NotActive();
        if (!isMember[id][member]) revert NotAMember();
        if (hasPaid[id][c.round][member]) revert AlreadyPaid();
    }

    function _contribute(Circle storage c, uint256 id, address member, address relayer, uint256 fee) internal {
        uint16 round = c.round;
        hasPaid[id][round][member] = true;
        c.pot += c.contribution;
        c.paidCount += 1;
        records[member].paid += 1;
        emit Contributed(id, round, member, c.contribution, relayer, fee);
        if (c.paidCount == c.size) _payout(c, id);
    }

    function _payout(Circle storage c, uint256 id) internal {
        uint16 round = c.round;
        address to = _members[id][round];
        uint256 amount = c.pot;
        c.pot = 0;
        c.paidCount = 0;
        c.round = round + 1;
        records[to].received += 1;
        bool pushed = amount == 0 || _tryPush(to, amount);
        if (!pushed) owed[to] += amount;
        emit PotPaid(id, round, to, amount, pushed);
        if (c.round == c.size) {
            c.status = Status.Completed;
            c.deadline = 0;
            emit CircleCompleted(id);
            // Deposits go back automatically; one that cannot be pushed waits in `owed`.
            address[] storage m = _members[id];
            for (uint256 i; i < m.length; ++i) {
                address who = m[i];
                records[who].circlesCompleted += 1;
                uint256 dep = depositOf[id][who];
                if (dep == 0) continue;
                depositOf[id][who] = 0;
                bool ok = _tryPush(who, dep);
                if (!ok) owed[who] += dep;
                emit DepositReturned(id, who, dep, ok);
            }
        } else {
            c.deadline = uint64(block.timestamp) + c.roundDuration;
        }
    }

    /// @dev Pull `value` from `member` via EIP-3009 and pay the caller the part above `due`.
    function _receiveSigned(
        address member,
        uint256 value,
        uint256 due,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal returns (uint256 fee) {
        if (value < due || value - due > maxRelayFee) revert BadAmount();
        usdc.receiveWithAuthorization(member, address(this), value, validAfter, validBefore, nonce, v, r, s);
        fee = value - due;
        if (fee > 0) _push(msg.sender, fee);
    }

    function _pull(address from, uint256 amount) internal {
        if (!usdc.transferFrom(from, address(this), amount)) revert TransferFailed();
    }

    function _push(address to, uint256 amount) internal {
        if (!usdc.transfer(to, amount)) revert TransferFailed();
    }

    function _tryPush(address to, uint256 amount) internal returns (bool ok) {
        (bool success, bytes memory ret) = address(usdc).call(abi.encodeCall(IUSDC.transfer, (to, amount)));
        ok = success && (ret.length == 0 || abi.decode(ret, (bool)));
    }
}
