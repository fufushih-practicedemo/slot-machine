import { Application, Container, Graphics } from 'pixi.js';
import { Reel } from './reel';
import { UI } from './ui';
import { SlotApi, SpinResult } from '../slotApi';

export class SlotMachine {
    private app: Application;
    private mainContainer: Container;
    private reelContainer: Container;
    private frameContainer: Container;
    private winLinesContainer: Container;
    private reels: Reel[];
    private ui: UI;
    private balance: number;
    private spinning: boolean = false;
    private spinResult: SpinResult | null = null;
    private winLines: Graphics[];
    private winningSymbols: Container[][] = [];

    static readonly REELS = 5;
    static readonly VISIBLE_SYMBOLS = 4;
    static readonly REEL_WIDTH = 160;
    static readonly SYMBOL_SIZE = 120;
    static readonly TOTAL_SYMBOLS = 12;
    static readonly REEL_SPIN_TIME = 2000;
    static readonly REEL_STOP_DELAY = 500;

    constructor() {
        this.app = new Application();
        this.mainContainer = new Container();
        this.reelContainer = new Container();
        this.frameContainer = new Container();
        this.winLinesContainer = new Container();
        this.reels = [];
        this.balance = 1000;
        this.winLines = [];
        this.winningSymbols = Array(SlotMachine.REELS).fill(null).map(() => []);
    }

    async init() {
        await this.app.init({ background: '#1099bb', resizeTo: window });
        document.body.appendChild(this.app.canvas);

        this.app.stage.addChild(this.mainContainer);
        this.mainContainer.addChild(this.reelContainer, this.frameContainer, this.winLinesContainer);

        this.createReels();
        this.createFrame();
        this.createWinLines();
        this.createUI();
        this.centerElements();
    }

    private createReels() {
        for (let i = 0; i < SlotMachine.REELS; i++) {
            const reel = new Reel(i * SlotMachine.REEL_WIDTH);
            this.reelContainer.addChild(reel.container);
            this.reels.push(reel);
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

    private createFrame() {
        const frame = new Graphics();
        frame.lineStyle(5, 0xFFD700, 1);
        frame.drawRect(
            -10,
            -10,
            SlotMachine.REEL_WIDTH * SlotMachine.REELS + 20,
            SlotMachine.SYMBOL_SIZE * SlotMachine.VISIBLE_SYMBOLS + 20
        );
        this.frameContainer.addChild(frame);
    }

    private createWinLines() {
        for (let i = 0; i < SlotMachine.VISIBLE_SYMBOLS; i++) {
            const line = new Graphics();
            line.lineStyle(5, 0xFF0000, 1);
            line.moveTo(0, (i + 0.5) * SlotMachine.SYMBOL_SIZE);
            line.lineTo(SlotMachine.REEL_WIDTH * SlotMachine.REELS, (i + 0.5) * SlotMachine.SYMBOL_SIZE);
            line.visible = false;
            this.winLinesContainer.addChild(line);
            this.winLines.push(line);
        }
    }

    private createUI() {
        this.ui = new UI(this.balance, () => this.spin());
        this.mainContainer.addChild(this.ui.container);
    }

    private centerElements() {
        const padding = 20;
        const totalWidth = SlotMachine.REEL_WIDTH * SlotMachine.REELS;
        const totalHeight = SlotMachine.SYMBOL_SIZE * SlotMachine.VISIBLE_SYMBOLS;

        this.mainContainer.x = (this.app.screen.width - totalWidth) / 2;
        this.mainContainer.y = (this.app.screen.height - totalHeight) / 2 - padding;

        this.ui.positionElements(totalWidth, totalHeight);
    }

    private async spin() {
        if (this.spinning || this.balance < 10) return;

        this.spinning = true;
        this.balance -= 10;
        this.ui.updateBalance(this.balance);

        this.spinResult = await SlotApi.spin();

        const totalSpinTime = SlotMachine.REEL_SPIN_TIME + (SlotMachine.REELS - 1) * SlotMachine.REEL_STOP_DELAY;
        const startTime = Date.now();

        const spinPromises = this.reels.map((reel, index) => 
            new Promise<void>(resolve => {
                setTimeout(() => {
                    reel.spin(this.spinResult!.board[index]).then(resolve);
                }, index * SlotMachine.REEL_STOP_DELAY);
            })
        );

        await Promise.all(spinPromises);

        this.spinning = false;
        this.handleSpinResult();
    }

    private handleSpinResult() {
        if (!this.spinResult) return;

        this.balance += this.spinResult.winAmount;
        this.ui.updateBalance(this.balance);
        this.ui.updateWinningDisplay(this.spinResult.winAmount);
        this.showWinLines(this.spinResult.board);
    }

    private showWinLines(board: string[][]) {
        this.clearWinningSymbols();

        for (let row = 0; row < SlotMachine.VISIBLE_SYMBOLS; row++) {
            const symbols = board.map(reel => reel[row]);
            const uniqueSymbols = new Set(symbols);
            if (uniqueSymbols.size === 1) {
                this.highlightWinningSymbols(row);
            }
        }
    }

    private clearWinningSymbols() {
        this.winningSymbols.forEach(reel => {
            reel.forEach(symbol => {
                if (symbol.parent) {
                    symbol.parent.removeChild(symbol);
                }
            });
        });
        this.winningSymbols = Array(SlotMachine.REELS).fill(null).map(() => []);
    }

    private highlightWinningSymbols(row: number) {
        for (let i = 0; i < SlotMachine.REELS; i++) {
            const symbolContainer = this.reels[i].container.children[row] as Container;
            const highlight = new Graphics();
            highlight.lineStyle(5, 0xFFD700, 1);
            highlight.drawRect(-SlotMachine.SYMBOL_SIZE / 2, -SlotMachine.SYMBOL_SIZE / 2, SlotMachine.SYMBOL_SIZE, SlotMachine.SYMBOL_SIZE);
            symbolContainer.addChild(highlight);
            this.winningSymbols[i].push(highlight);
        }
    }
}