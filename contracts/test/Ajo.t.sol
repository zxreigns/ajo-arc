// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ajo, IUSDC} from "../src/Ajo.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract AjoTest is Test {
    MockUSDC usdc;
    Ajo ajo;
    uint256 constant C = 10e6; // 10 USDC
    uint256 constant D = 10e6;
    uint256 constant FEE = 5_000; // 0.005 USDC
    uint256[3] pk = [uint256(0xA11CE), 0xB0B, 0xC4A1];
    address[3] who;
    address relayer = address(0xFEE);

    function setUp() public {
        vm.warp(1_000_000);
        usdc = new MockUSDC();
        ajo = new Ajo(IUSDC(address(usdc)), 50_000);
        for (uint256 i; i < 3; ++i) {
            who[i] = vm.addr(pk[i]);
            usdc.mint(who[i], 1_000e6);
            vm.prank(who[i]);
            usdc.approve(address(ajo), type(uint256).max);
        }
    }

    function _create() internal returns (uint256) {
        return ajo.createCircle("Lagos Friday", uint128(C), uint128(D), 3, 1 days);
    }

    function _sign(uint256 key, uint256 value, bytes32 nonce) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(),
            keccak256(abi.encode(usdc.RECEIVE_TYPEHASH(), vm.addr(key), address(ajo), value, 0, block.timestamp + 1 hours, nonce))));
        (v, r, s) = vm.sign(key, digest);
    }

    function _gaslessJoin(uint256 id, uint256 i) internal {
        bytes32 salt = keccak256(abi.encode("j", i));
        (uint8 v, bytes32 r, bytes32 s) = _sign(pk[i], D + FEE, ajo.joinNonce(id, who[i], salt));
        vm.prank(relayer);
        ajo.joinWithAuthorization(id, who[i], D + FEE, 0, block.timestamp + 1 hours, salt, v, r, s);
    }

    function _gaslessContribute(uint256 id, uint256 i) internal {
        (Ajo.Circle memory c,,,) = ajo.getCircle(id);
        bytes32 salt = keccak256(abi.encode("c", i, c.round));
        (uint8 v, bytes32 r, bytes32 s) = _sign(pk[i], C + FEE, ajo.contributeNonce(id, c.round, who[i], salt));
        vm.prank(relayer);
        ajo.contributeWithAuthorization(id, who[i], C + FEE, 0, block.timestamp + 1 hours, salt, v, r, s);
    }

    function test_fullCircle_gasless() public {
        uint256 id = _create();
        for (uint256 i; i < 3; ++i) _gaslessJoin(id, i);
        (Ajo.Circle memory c, address[] memory m,,) = ajo.getCircle(id);
        assertEq(uint8(c.status), uint8(Ajo.Status.Active));
        assertEq(m[0], who[0]);
        assertEq(usdc.balanceOf(relayer), 3 * FEE);

        for (uint16 r; r < 3; ++r) {
            uint256 before = usdc.balanceOf(who[r]);
            for (uint256 i; i < 3; ++i) _gaslessContribute(id, i);
            // recipient paid C+FEE and got 3C back
            assertEq(usdc.balanceOf(who[r]), before - C - FEE + 3 * C + (r == 2 ? D : 0)); // last round also returns deposits
        }
        (c,,,) = ajo.getCircle(id);
        assertEq(uint8(c.status), uint8(Ajo.Status.Completed));
        for (uint256 i; i < 3; ++i) {
            assertEq(ajo.depositOf(id, who[i]), 0); // returned automatically
            (uint32 paid, uint32 missed, uint32 received, uint32 done) = ajo.records(who[i]);
            assertEq(paid, 3); assertEq(missed, 0); assertEq(received, 1); assertEq(done, 1);
            // net: paid 3C + 3 contribution fees + join fee, received 3C
            assertEq(usdc.balanceOf(who[i]), 1_000e6 - 4 * FEE);
        }
        assertEq(usdc.balanceOf(address(ajo)), 0);
    }

    function test_directFlow_and_settleDefault() public {
        uint256 id = _create();
        for (uint256 i; i < 3; ++i) { vm.prank(who[i]); ajo.join(id); }
        vm.prank(who[0]); ajo.contribute(id);
        vm.prank(who[1]); ajo.contribute(id);
        vm.expectRevert(Ajo.RoundStillOpen.selector);
        ajo.settle(id);
        vm.warp(1_000_000 + 1 days + 1);
        uint256 before = usdc.balanceOf(who[0]);
        ajo.settle(id); // who[2] misses; deposit covers
        assertEq(usdc.balanceOf(who[0]), before + 3 * C);
        assertEq(ajo.depositOf(id, who[2]), 0);
        (, uint32 missed,,) = ajo.records(who[2]);
        assertEq(missed, 1);
        // second round: who[2] defaults again with no deposit left -> pot short
        vm.prank(who[0]); ajo.contribute(id);
        vm.prank(who[1]); ajo.contribute(id);
        vm.warp(1_000_000 + 2 days + 2);
        uint256 b1 = usdc.balanceOf(who[1]);
        ajo.settle(id);
        assertEq(usdc.balanceOf(who[1]), b1 + 2 * C);
    }

    function test_signatureCannotMoveToOtherCircle() public {
        uint256 a = _create();
        uint256 b = _create();
        bytes32 salt = bytes32(uint256(7));
        (uint8 v, bytes32 r, bytes32 s) = _sign(pk[0], D, ajo.joinNonce(a, who[0], salt));
        vm.expectRevert(bytes("ECRecover: invalid signature"));
        ajo.joinWithAuthorization(b, who[0], D, 0, block.timestamp + 1 hours, salt, v, r, s);
        ajo.joinWithAuthorization(a, who[0], D, 0, block.timestamp + 1 hours, salt, v, r, s);
        assertTrue(ajo.isMember(a, who[0]));
    }

    function test_relayFeeCapped() public {
        uint256 id = _create();
        bytes32 salt = bytes32(uint256(1));
        uint256 value = D + 50_001;
        (uint8 v, bytes32 r, bytes32 s) = _sign(pk[0], value, ajo.joinNonce(id, who[0], salt));
        vm.expectRevert(Ajo.BadAmount.selector);
        ajo.joinWithAuthorization(id, who[0], value, 0, block.timestamp + 1 hours, salt, v, r, s);
    }

    function test_leaveBeforeStart() public {
        uint256 id = _create();
        vm.prank(who[0]); ajo.join(id);
        vm.prank(who[1]); ajo.join(id);
        vm.prank(who[0]); ajo.leave(id);
        (, address[] memory m,,) = ajo.getCircle(id);
        assertEq(m.length, 1);
        assertEq(m[0], who[1]);
        assertEq(usdc.balanceOf(who[0]), 1_000e6);
    }

    function test_blockedRecipientDoesNotStallCircle() public {
        uint256 id = _create();
        for (uint256 i; i < 3; ++i) { vm.prank(who[i]); ajo.join(id); }
        vm.prank(who[0]); ajo.contribute(id);
        vm.prank(who[1]); ajo.contribute(id);
        usdc.setBlocked(who[0], true);
        // who[0]'s own funds are frozen by the token, but others keep going; pot waits in `owed`
        vm.prank(who[2]); ajo.contribute(id);
        assertEq(ajo.owed(who[0]), 3 * C);
        (Ajo.Circle memory c,,,) = ajo.getCircle(id);
        assertEq(c.round, 1);
        usdc.setBlocked(who[0], false);
        vm.prank(who[0]); ajo.withdrawOwed();
        assertEq(ajo.owed(who[0]), 0);
    }

    function test_badParams() public {
        vm.expectRevert(Ajo.BadParams.selector);
        ajo.createCircle("x", uint128(C), 0, 1, 1 days);
        vm.expectRevert(Ajo.BadParams.selector);
        ajo.createCircle("x", 0, 0, 3, 1 days);
    }

    function test_doublePayReverts() public {
        uint256 id = _create();
        for (uint256 i; i < 3; ++i) { vm.prank(who[i]); ajo.join(id); }
        vm.prank(who[0]); ajo.contribute(id);
        vm.prank(who[0]);
        vm.expectRevert(Ajo.AlreadyPaid.selector);
        ajo.contribute(id);
    }
}
