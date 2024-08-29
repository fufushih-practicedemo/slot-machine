import { Application, Container, Text, TextStyle, Ticker, Graphics } from 'pixi.js';

export class SlotMachine {
    private app: Application;
    private reelContainer: Container;
    private reels: Container[];
    private balance: number;
    private balanceText: Text;
    private spinButton: Text;
    private spinning: boolean = false;

    private static readonly REEL_WIDTH = 160;
    private static readonly SYMBOL_SIZE = 120;
    private static readonly REELS = 5;
    private static readonly VISIBLE_SYMBOLS = 4;
    private static readonly TOTAL_SYMBOLS = 12;
    private static readonly SYMBOLS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '💎'];
    private static readonly SYMBOL_VALUES: { [key: string]: number } = {
        '🍎': 10, '🍊': 20, '🍋': 30, '🍉': 40, '🍇': 50, '🍓': 60, '🍒': 70, '💎': 100
    };
    private static readonly SPIN_DURATION = 4000;
    private static readonly MAX_SPEED = 50;
    private static readonly ACCELERATION_TIME = 500;
    private static readonly REEL_STOP_INTERVAL = 500;

    constructor() {
        this.app = new Application();
        this.reelContainer = new Container();
        this.reels = [];
        this.balance = 1000;
    }

    async init() {
        await this.app.init({ background: '#1099bb', resizeTo: window });
        document.body.appendChild(this.app.canvas);
        this.app.stage.addChild(this.reelContainer);
        this.createReels();
        this.createFrame();
        this.createUI();
        this.centerElements();
    }

    private createFrame() {
        const frame = new Graphics();
        frame.lineStyle(5, 0xFFD700, 1); // Gold color frame
        frame.drawRect(
            -10, // Add some padding
            -10,
            SlotMachine.REEL_WIDTH * SlotMachine.REELS + 20, // Add padding on both sides
            SlotMachine.SYMBOL_SIZE * SlotMachine.VISIBLE_SYMBOLS + 20
        );
        this.reelContainer.addChild(frame);
    }

    private createReels() {
        for (let i = 0; i < SlotMachine.REELS; i++) {
            const reel = new Container();
            reel.x = i * SlotMachine.REEL_WIDTH;
            this.reelContainer.addChild(reel);
            this.reels.push(reel);

            for (let j = 0; j < SlotMachine.TOTAL_SYMBOLS; j++) {
                const symbol = new Text(this.getRandomSymbol(), new TextStyle({
                    fontFamily: 'Arial',
                    fontSize: 80,
                    fill: 0xffffff,
                }));
                symbol.y = j * SlotMachine.SYMBOL_SIZE;
                symbol.x = SlotMachine.REEL_WIDTH / 2;
                symbol.anchor.set(0.5);
                reel.addChild(symbol);
            }
        }

        // Create mask
        const mask = new Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(0, 0, 
            SlotMachine.REEL_WIDTH * SlotMachine.REELS, 
            SlotMachine.SYMBOL_SIZE * SlotMachine.VISIBLE_SYMBOLS
        );
        mask.endFill();
        this.reelContainer.mask = mask;
        this.reelContainer.addChild(mask);
    }

    private centerElements() {
        // Center the reel container
        this.reelContainer.x = (this.app.screen.width - this.reelContainer.width) / 2;
        this.reelContainer.y = (this.app.screen.height - this.reelContainer.height) / 2;

        // Adjust UI elements
        this.balanceText.x = this.reelContainer.x;
        this.balanceText.y = this.reelContainer.y + this.reelContainer.height + 20;

        this.spinButton.x = this.reelContainer.x + this.reelContainer.width - this.spinButton.width;
        this.spinButton.y = this.reelContainer.y + this.reelContainer.height + 20;
    }

    private createUI() {
        this.balanceText = new Text(`Balance: ${this.balance}`, new TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
        }));
        this.app.stage.addChild(this.balanceText);

        this.spinButton = new Text('SPIN', new TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
        }));
        this.spinButton.eventMode = 'static';
        this.spinButton.cursor = 'pointer';
        this.spinButton.on('pointerdown', () => this.spin());
        this.app.stage.addChild(this.spinButton);
    }


    private getRandomSymbol(): string {
        return SlotMachine.SYMBOLS[Math.floor(Math.random() * SlotMachine.SYMBOLS.length)];
    }

    private spin() {
        if (this.spinning || this.balance < 10) return;

        this.spinning = true;
        this.balance -= 10;
        this.balanceText.text = `Balance: ${this.balance}`;

        const startTime = Date.now();

        const ticker = new Ticker();
        ticker.add(() => {
            const elapsed = Date.now() - startTime;
            
            this.reels.forEach((reel, i) => {
                const reelStopTime = SlotMachine.SPIN_DURATION - (SlotMachine.REELS - i - 1) * SlotMachine.REEL_STOP_INTERVAL;
                const reelProgress = Math.min(elapsed / reelStopTime, 1);

                const distance = this.calculateReelDistance(reelProgress, elapsed);
                reel.y = distance % (SlotMachine.TOTAL_SYMBOLS * SlotMachine.SYMBOL_SIZE);

                // Wrap symbols
                reel.children.forEach((symbol) => {
                    if (symbol instanceof Container) return; // Skip decorations
                    if (symbol.y >= SlotMachine.TOTAL_SYMBOLS * SlotMachine.SYMBOL_SIZE) {
                        symbol.y -= SlotMachine.TOTAL_SYMBOLS * SlotMachine.SYMBOL_SIZE;
                    }
                });

                // Ensure final position aligns with symbol grid
                if (reelProgress === 1) {
                    const finalOffset = Math.round(reel.y / SlotMachine.SYMBOL_SIZE) * SlotMachine.SYMBOL_SIZE;
                    reel.y = finalOffset % (SlotMachine.TOTAL_SYMBOLS * SlotMachine.SYMBOL_SIZE);
                }
            });

            // Stop spinning when all reels have stopped
            if (elapsed >= SlotMachine.SPIN_DURATION) {
                ticker.destroy();
                this.spinning = false;
                this.checkWinnings();
            }
        });
        ticker.start();
    }

    private calculateReelDistance(progress: number, elapsed: number): number {
        let distance = 0;

        if (elapsed < SlotMachine.ACCELERATION_TIME) {
            // Acceleration phase
            const accelerationProgress = elapsed / SlotMachine.ACCELERATION_TIME;
            distance = 0.5 * SlotMachine.MAX_SPEED * Math.pow(accelerationProgress, 2) * SlotMachine.ACCELERATION_TIME;
        } else if (progress < 1) {
            // Constant speed phase
            const constantSpeedTime = elapsed - SlotMachine.ACCELERATION_TIME;
            distance = 0.5 * SlotMachine.MAX_SPEED * SlotMachine.ACCELERATION_TIME + SlotMachine.MAX_SPEED * constantSpeedTime;
        } else {
            // Deceleration phase (instant stop for simplicity)
            const totalSpinDistance = 0.5 * SlotMachine.MAX_SPEED * SlotMachine.ACCELERATION_TIME + 
                                      SlotMachine.MAX_SPEED * (elapsed - SlotMachine.ACCELERATION_TIME);
            distance = Math.floor(totalSpinDistance / (SlotMachine.SYMBOL_SIZE * SlotMachine.TOTAL_SYMBOLS)) * 
                       (SlotMachine.SYMBOL_SIZE * SlotMachine.TOTAL_SYMBOLS);
        }

        return distance;
    }

    private checkWinnings() {
        const visibleSymbols = this.reels.map(reel => 
            reel.children.slice(0, SlotMachine.VISIBLE_SYMBOLS).map(symbol => (symbol as Text).text)
        );

        let winnings = 0;
        for (let row = 0; row < SlotMachine.VISIBLE_SYMBOLS; row++) {
            const symbols = visibleSymbols.map(reel => reel[row]);
            const uniqueSymbols = new Set(symbols);
            if (uniqueSymbols.size === 1) {
                winnings += SlotMachine.SYMBOL_VALUES[symbols[0]] * 5;
            }
        }

        this.balance += winnings;
        this.balanceText.text = `Balance: ${this.balance}`;
        this.updateWinningDisplay(winnings);
    }

    private updateWinningDisplay(winnings: number) {
        this.app.stage.children.forEach(child => {
            if (child instanceof Text && child.name === 'winningText') {
                this.app.stage.removeChild(child);
            }
        });

        if (winnings > 0) {
            const winText = new Text(`You won: ${winnings}`, new TextStyle({
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xffff00,
            }));
            winText.x = this.reelContainer.x + this.reelContainer.width / 2;
            winText.y = this.reelContainer.y - 40;
            winText.anchor.set(0.5);
            winText.name = 'winningText';
            this.app.stage.addChild(winText);
        }
    }
}