import { Container, Text, TextStyle, Ticker } from 'pixi.js';

export class Reel {
    container: Container;
    private symbols: Container[];
    private spinning: boolean = false;

    private static readonly TOTAL_SYMBOLS = 12;
    private static readonly SYMBOL_SIZE = 120;
    private static readonly SYMBOLS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '💎'];
    private static readonly SPIN_DURATION = 2000;
    private static readonly MAX_SPEED = 50;

    constructor(x: number) {
        this.container = new Container();
        this.container.x = x;
        this.symbols = [];

        this.createSymbols();
    }

    private createSymbols() {
        for (let i = 0; i < Reel.TOTAL_SYMBOLS; i++) {
            const symbolContainer = new Container();
            const symbol = new Text(this.getRandomSymbol(), new TextStyle({
                fontFamily: 'Arial',
                fontSize: 80,
                fill: 0xffffff,
            }));
            symbol.anchor.set(0.5);
            symbolContainer.addChild(symbol);

            symbolContainer.y = i * Reel.SYMBOL_SIZE + 50;
            symbolContainer.x = Reel.SYMBOL_SIZE / 2;

            this.container.addChild(symbolContainer);
            this.symbols.push(symbolContainer);
        }
    }

    private getRandomSymbol(): string {
        return Reel.SYMBOLS[Math.floor(Math.random() * Reel.SYMBOLS.length)];
    }

    spin(finalSymbols: string[]): Promise<void> {
        return new Promise((resolve) => {
            if (this.spinning) return;
            this.spinning = true;

            const startTime = Date.now();
            const ticker = new Ticker();
            ticker.add(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / Reel.SPIN_DURATION, 1);

                if (progress < 1) {
                    const distance = this.calculateReelDistance(progress);
                    this.container.y = distance % (Reel.TOTAL_SYMBOLS * Reel.SYMBOL_SIZE);
                    this.wrapReelSymbols();
                } else {
                    ticker.destroy();
                    this.setFinalPosition(finalSymbols);
                    this.spinning = false;
                    resolve();
                }
            });
            ticker.start();
        });
    }

    private calculateReelDistance(progress: number): number {
        if (progress < 0.5) {
            return Reel.MAX_SPEED * progress * Reel.SPIN_DURATION;
        } else {
            const decelerationProgress = (progress - 0.5) / 0.5;
            return Reel.MAX_SPEED * Reel.SPIN_DURATION * 0.5 * (2 - decelerationProgress);
        }
    }

    private wrapReelSymbols() {
        this.symbols.forEach((symbol) => {
            if (symbol.y >= Reel.TOTAL_SYMBOLS * Reel.SYMBOL_SIZE) {
                symbol.y -= Reel.TOTAL_SYMBOLS * Reel.SYMBOL_SIZE;
            }
        });
    }

    private setFinalPosition(finalSymbols: string[]) {
        let offset = Math.floor(Math.random() * (Reel.TOTAL_SYMBOLS - finalSymbols.length));

        for (let i = 0; i < Reel.TOTAL_SYMBOLS; i++) {
            const symbolIndex = (i + offset) % Reel.TOTAL_SYMBOLS;
            const symbol = this.symbols[i].children[0] as Text;
            if (symbolIndex < finalSymbols.length) {
                symbol.text = finalSymbols[symbolIndex];
            } else {
                symbol.text = this.getRandomSymbol();
            }
        }

        this.container.y = -offset * Reel.SYMBOL_SIZE;
    }
}