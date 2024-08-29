import { Application, Container, Text, TextStyle, Ticker, Graphics } from 'pixi.js';
import { SlotApi, SpinResult } from '../slotApi';

export class SlotMachine {
    private app: Application;
    private reelContainer: Container;
    private reels: Container[];
    private balance: number;
    private balanceText: Text;
    private spinButton: Text;
    private spinning: boolean = false;
    private spinResult: SpinResult | null = null;
    private winLines: Graphics[];

    private static readonly REEL_WIDTH = 160;
    private static readonly SYMBOL_SIZE = 120;
    private static readonly REELS = 5;
    private static readonly VISIBLE_SYMBOLS = 4;
    private static readonly TOTAL_SYMBOLS = 12;
    private static readonly SYMBOLS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '💎'];
    private static readonly SPIN_DURATION = 4000;
    private static readonly MAX_SPEED = 50;
    private static readonly REEL_SPIN_TIME = 2000;
    private static readonly REEL_STOP_DELAY = 500;
    private static readonly SPIN_TIME_BEFORE_STOP = 2000; // Time to spin before stopping starts
    private static readonly REEL_STOP_INTERVAL = 200; // Time between each reel stopping

    constructor() {
        this.app = new Application();
        this.reelContainer = new Container();
        this.reels = [];
        this.balance = 1000;
        this.winLines = [];
    }

    async init() {
        await this.app.init({ background: '#1099bb', resizeTo: window });
        document.body.appendChild(this.app.canvas);
        this.app.stage.addChild(this.reelContainer);
        this.createReels();
        this.createFrame();
        this.createUI();
        this.centerElements();
        this.createWinLines();
    }

    private createFrame() {
        const frame = new Graphics();
        frame.lineStyle(5, 0xFFD700, 1);
        frame.drawRect(
            -10,
            -10,
            SlotMachine.REEL_WIDTH * SlotMachine.REELS + 20,
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
                symbol.y = j * SlotMachine.SYMBOL_SIZE + 50;
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
        const padding = 20;
        const totalWidth = SlotMachine.REEL_WIDTH * SlotMachine.REELS;
        const totalHeight = SlotMachine.SYMBOL_SIZE * SlotMachine.VISIBLE_SYMBOLS;

        this.reelContainer.x = (this.app.screen.width - totalWidth) / 2;
        this.reelContainer.y = (this.app.screen.height - totalHeight) / 2 - padding;

        this.balanceText.x = this.reelContainer.x;
        this.balanceText.y = this.reelContainer.y + totalHeight + padding;

        this.spinButton.x = this.reelContainer.x + totalWidth - this.spinButton.width;
        this.spinButton.y = this.reelContainer.y + totalHeight + padding;
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

    private async spin() {
        if (this.spinning || this.balance < 10) return;

        this.spinning = true;
        this.balance -= 10;
        this.balanceText.text = `Balance: ${this.balance}`;

        // Call the mock API
        this.spinResult = await SlotApi.spin();

        const startTime = Date.now();
        const totalSpinTime = SlotMachine.REEL_SPIN_TIME + (SlotMachine.REELS - 1) * SlotMachine.REEL_STOP_DELAY;

        const ticker = new Ticker();
        ticker.add(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / totalSpinTime, 1);

            this.reels.forEach((reel, i) => {
                const reelStartTime = i * SlotMachine.REEL_STOP_DELAY;
                const reelElapsed = Math.max(0, elapsed - reelStartTime);
                const reelProgress = Math.min(reelElapsed / SlotMachine.REEL_SPIN_TIME, 1);

                if (reelProgress < 1) {
                    const distance = this.calculateReelDistance(reelProgress);
                    reel.y = distance % (SlotMachine.TOTAL_SYMBOLS * SlotMachine.SYMBOL_SIZE);
                    this.wrapReelSymbols(reel);
                } else if (reelProgress === 1) {
                    this.setReelToFinalPosition(reel, i);
                }
            });

            if (progress === 1) {
                ticker.destroy();
                this.spinning = false;
                this.handleSpinResult();
            }
        });
        ticker.start();
    }

    private calculateReelDistance(progress: number): number {
        if (progress < 0.5) {
            return SlotMachine.MAX_SPEED * progress * SlotMachine.REEL_SPIN_TIME;
        } else {
            const decelerationProgress = (progress - 0.5) / 0.5;
            return SlotMachine.MAX_SPEED * SlotMachine.REEL_SPIN_TIME * 0.5 * (2 - decelerationProgress);
        }
    }

    private wrapReelSymbols(reel: Container) {
        reel.children.forEach((symbol) => {
            if (symbol instanceof Container) return; // Skip decorations
            if (symbol.y >= SlotMachine.TOTAL_SYMBOLS * SlotMachine.SYMBOL_SIZE) {
                symbol.y -= SlotMachine.TOTAL_SYMBOLS * SlotMachine.SYMBOL_SIZE;
            }
        });
    }

    private setReelToFinalPosition(reel: Container, reelIndex: number) {
        if (!this.spinResult) return;

        const finalSymbols = this.spinResult.board[reelIndex];
        let offset = Math.floor(Math.random() * (SlotMachine.TOTAL_SYMBOLS - SlotMachine.VISIBLE_SYMBOLS));
        
        for (let i = 0; i < SlotMachine.TOTAL_SYMBOLS; i++) {
            const symbolIndex = (i + offset) % SlotMachine.TOTAL_SYMBOLS;
            const symbol = reel.children[i] as Text;
            if (symbolIndex < SlotMachine.VISIBLE_SYMBOLS) {
                symbol.text = finalSymbols[symbolIndex];
            } else {
                symbol.text = this.getRandomSymbol();
            }
            symbol.y = i * SlotMachine.SYMBOL_SIZE + 50;
        }
        
        reel.y = -offset * SlotMachine.SYMBOL_SIZE;
    }

    private createWinLines() {
        for (let i = 0; i < SlotMachine.VISIBLE_SYMBOLS; i++) {
            const line = new Graphics();
            line.lineStyle(5, 0xFF0000, 1);
            line.moveTo(0, (i + 0.5) * SlotMachine.SYMBOL_SIZE);
            line.lineTo(SlotMachine.REEL_WIDTH * SlotMachine.REELS, (i + 0.5) * SlotMachine.SYMBOL_SIZE);
            line.visible = false;
            this.reelContainer.addChild(line);
            this.winLines.push(line);
        }
    }

    private handleSpinResult() {
        if (!this.spinResult) return;

        this.balance += this.spinResult.winAmount;
        this.balanceText.text = `Balance: ${this.balance}`;
        this.updateWinningDisplay(this.spinResult.winAmount);
        this.showWinLines(this.spinResult.board);
    }

    private showWinLines(board: string[][]) {
        this.winLines.forEach(line => line.visible = false);

        for (let row = 0; row < SlotMachine.VISIBLE_SYMBOLS; row++) {
            const symbols = board.map(reel => reel[row]);
            const uniqueSymbols = new Set(symbols);
            if (uniqueSymbols.size === 1) {
                this.winLines[row].visible = true;
            }
        }
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
                stroke: 0x000000,
            }));
            winText.x = this.reelContainer.x + this.reelContainer.width / 2;
            winText.y = this.reelContainer.y - 40;
            winText.anchor.set(0.5);
            winText.name = 'winningText';
            this.app.stage.addChild(winText);
        }
    }

    
}