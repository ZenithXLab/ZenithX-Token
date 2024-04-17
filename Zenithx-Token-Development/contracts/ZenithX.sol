/*

$$$$$$$$\ $$$$$$$$\ $$\   $$\ $$$$$$\ $$$$$$$$\ $$\   $$\ $$\   $$\       $$$$$$$$\  $$$$$$\  $$\   $$\ $$$$$$$$\ $$\   $$\ 
\____$$  |$$  _____|$$$\  $$ |\_$$  _|\__$$  __|$$ |  $$ |$$ |  $$ |      \__$$  __|$$  __$$\ $$ | $$  |$$  _____|$$$\  $$ |
    $$  / $$ |      $$$$\ $$ |  $$ |     $$ |   $$ |  $$ |\$$\ $$  |         $$ |   $$ /  $$ |$$ |$$  / $$ |      $$$$\ $$ |
   $$  /  $$$$$\    $$ $$\$$ |  $$ |     $$ |   $$$$$$$$ | \$$$$  /          $$ |   $$ |  $$ |$$$$$  /  $$$$$\    $$ $$\$$ |
  $$  /   $$  __|   $$ \$$$$ |  $$ |     $$ |   $$  __$$ | $$  $$<           $$ |   $$ |  $$ |$$  $$<   $$  __|   $$ \$$$$ |
 $$  /    $$ |      $$ |\$$$ |  $$ |     $$ |   $$ |  $$ |$$  /\$$\          $$ |   $$ |  $$ |$$ |\$$\  $$ |      $$ |\$$$ |
$$$$$$$$\ $$$$$$$$\ $$ | \$$ |$$$$$$\    $$ |   $$ |  $$ |$$ /  $$ |         $$ |    $$$$$$  |$$ | \$$\ $$$$$$$$\ $$ | \$$ |
\________|\________|\__|  \__|\______|   \__|   \__|  \__|\__|  \__|         \__|    \______/ \__|  \__|\________|\__|  \__|
                                                                
*/


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

interface IFactoryV2 {
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address lpPair,
        uint
    );

    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address lpPair);

    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address lpPair);
}

interface IV2Pair {
    function factory() external view returns (address);

    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function sync() external;
}

interface IRouter01 {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    )
        external
        payable
        returns (uint amountToken, uint amountETH, uint liquidity);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);

    function getAmountsIn(
        uint amountOut,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

interface IRouter02 is IRouter01 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract ZenithX is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    // Token details
    string private constant _name = "ZenithX";
    string private constant _symbol = "ZNX";
    uint256 public constant max_Supply = 1_000_000_000 * 10 ** 18;

    // Minting amounts for different years
    uint256 private constant FIRST_YEAR_MINT_AMOUNT = 350_000_000 * 10 ** 18;
    uint256 private constant SECOND_YEAR_MINT_AMOUNT = 350_000_000 * 10 ** 18;
    uint256 private constant THIRD_YEAR_MINT_AMOUNT = 300_000_000 * 10 ** 18;
    uint8 private _mintingCount;

    // Burning configuration
    bool public burning = false;
    uint256 public burnFee = 10;
    uint256 public constant fee_denominator = 1_000;

    // Lock duration for minting
    uint256 private constant LOCK_DURATION = 1 minutes;
    uint256 private lastMintTimestamp;

    // Router and LP pair details
    IRouter02 public swapRouter;
    mapping (address => bool) private isLpPair;
    address public lpPair;

    // Liquidity provision control
    uint256 public liquidityPauseTime;
    uint256 public lastLiquidityStartTime;

    // Events for minting, burning, LP pair change, and burn amount change
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event ChangePair(address newLpPair);
    event ChangeBurnAmount(uint256 burningPercentage);

    // Modifier to pause transfers during liquidity provision
    modifier liquidityPeriodPause {
        require(block.timestamp >= liquidityPauseTime || msg.sender == owner(), "Adding Liquidity: Transfer is paused for one hour");
        _;
    }

    // Constructor initializes the contract with initial minting and LP pair creation
    constructor(
        address initialOwner,
        address swap_router
    ) ERC20(_name, _symbol) ERC20Permit(_name) Ownable() {
        swapRouter = IRouter02(swap_router);

        // First year minting
        // Mint 350 million tokens with 18 decimal places
        _mint(msg.sender, FIRST_YEAR_MINT_AMOUNT);
        _mintingCount = 1;

        lastMintTimestamp = block.timestamp;

        // Create LP pair
        lpPair = IFactoryV2(swapRouter.factory()).createPair(
            swapRouter.WETH(),
            address(this)
        );

        // Mark LP pair
        isLpPair[lpPair] = true;

        // Approve the router to spend unlimited tokens
        _approve(initialOwner, address(swapRouter), type(uint256).max);
    }

    // Function for owner to mint tokens
    function mint(address to) public onlyOwner {
        require(totalSupply() < max_Supply, "Max supply reached");

        uint256 elapsedTime = block.timestamp - lastMintTimestamp;
        require(elapsedTime >= LOCK_DURATION, "Minting is locked");

        uint256 mintAmount;
        if (_mintingCount < 2) {
            // Second year minting
            mintAmount = SECOND_YEAR_MINT_AMOUNT;
        } else {
            // Third year minting
            mintAmount = THIRD_YEAR_MINT_AMOUNT;
        }

        _mint(to, mintAmount);
        ++_mintingCount;
        lastMintTimestamp = block.timestamp;

        emit Mint(to, mintAmount);
    }

    // Function to handle transfers with additional checks during liquidity provision
    function transfer(address to, uint256 amount) public liquidityPeriodPause override returns (bool) {
        if(burning && isLpPair[msg.sender] && isLpPair[to]){
            _performTransfer(msg.sender, to, amount);
            return true;
        }
        return super.transfer(to, amount);
    }

    // Function to handle transferFrom with additional checks during liquidity provision
    function transferFrom(address sender, address recipient, uint256 amount) public liquidityPeriodPause override returns (bool) {
        if(burning  && isLpPair[msg.sender] && isLpPair[recipient]){
            _performTransfer(sender, recipient, amount);
            super._spendAllowance(sender, msg.sender, amount);
            return true;
        }
        /* 
        // this if condition is only for testing purpose not for production, to see if buring is happing while calling the transferFrom function

        if(burning){
            _performTransfer(sender, recipient, amount);
            super._spendAllowance(sender, msg.sender, amount);          
            return true;
        }
        return super.transferFrom(sender, recipient, amount);
        }*/
    }

     // Internal function to perform transfers during burning
    function _performTransfer(address sender, address recipient, uint256 amount) private {
        uint256 burnAmount = (amount * burnFee) / fee_denominator;
        _burn(sender, burnAmount);
        amount -= burnAmount;
        emit Burn(sender, burnAmount);

        super._transfer(sender, recipient, amount);
    }

    // Function for owner to enable burning after a lock period
    function enableBurning() external onlyOwner {
        //while testing this fuction need to bypass the time stamp so comment out the require condition.
        uint256 elapsedTime = block.timestamp - lastMintTimestamp;
        require(elapsedTime >= 2 * LOCK_DURATION, "Transaction burning is locked for 2 years");
        burning = true;
    }

    // Function for owner to change the LP pair
    function changeLpPair(address newPair) external onlyOwner {
        require(newPair != address(0), "Zero adress detected");
        require(newPair != address(0xdead), "Dead address detected");
        lpPair = newPair;
        isLpPair[newPair] = true;
        emit ChangePair(newPair);
    }

    // Function for owner to change the burn percentage but not more than 5%
    function changeBurnPercentage(uint256 burningFee) external onlyOwner {
        require(burningFee <= 50, "you can't burn more than 5% of fees.");
        burnFee = burningFee;

        emit ChangeBurnAmount(burnFee);
    }

    // Remove random tokens from the contract and send to a wallet
    function remove_Random_Tokens(address random_Token_Address, address send_to_wallet, uint256 number_of_tokens) public onlyOwner returns(bool _sent){
        require(random_Token_Address != address(this), "Can not remove native token");
        uint256 randomBalance = IERC20(random_Token_Address).balanceOf(address(this));
        if (number_of_tokens > randomBalance){number_of_tokens = randomBalance;}
        _sent = IERC20(random_Token_Address).transfer(send_to_wallet, number_of_tokens);
    }

    // Function for owner to start providing liquidity with a one-day cooldown
    function startProvidingLiquidity() external onlyOwner {
        require(block.timestamp >= lastLiquidityStartTime + 1 days, "Can only start providing liquidity once a day");

        liquidityPauseTime = block.timestamp + 1 minutes;
        lastLiquidityStartTime = block.timestamp;
    }
}