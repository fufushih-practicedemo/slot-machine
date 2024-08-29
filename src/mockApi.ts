export interface SpinResult {
    board: string[][];
    isWin: boolean;
    winAmount: number;
}

export class MockSlotApi {
    private static readonly SYMBOLS = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '💎'];
    private static readonly REELS = 5;
    private static readonly VISIBLE_SYMBOLS = 4;
    private static readonly WIN_PROBABILITY = 1; // 30% chance of winning

    static spin(): Promise<SpinResult> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const shouldWin = Math.random() < this.WIN_PROBABILITY;
                const board = shouldWin ? this.generateWinningBoard() : this.generateBoard();
                const { isWin, winAmount } = this.calculateWin(board);
                resolve({ board, isWin, winAmount });
            }, 500); // Simulate network delay
        });
    }

    private static generateBoard(): string[][] {
        return Array(this.REELS).fill(null).map(() =>
            Array(this.VISIBLE_SYMBOLS).fill(null).map(() =>
                this.getRandomSymbol()
            )
        );
    }

    private static generateWinningBoard(): string[][] {
        const board = this.generateBoard();
        const winningRow = Math.floor(Math.random() * this.VISIBLE_SYMBOLS);
        const winningSymbol = this.getRandomSymbol();
        
        for (let i = 0; i < this.REELS; i++) {
            board[i][winningRow] = winningSymbol;
        }
        
        return board;
    }

    private static getRandomSymbol(): string {
        return this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)];
    }

    private static calculateWin(board: string[][]): { isWin: boolean, winAmount: number } {
        let winAmount = 0;
        const symbolValues: { [key: string]: number } = {
            '🍎': 10, '🍊': 20, '🍋': 30, '🍉': 40, '🍇': 50, '🍓': 60, '🍒': 70, '💎': 100
        };

        for (let row = 0; row < this.VISIBLE_SYMBOLS; row++) {
            const symbols = board.map(reel => reel[row]);
            const uniqueSymbols = new Set(symbols);
            if (uniqueSymbols.size === 1) {
                winAmount += symbolValues[symbols[0]] * 5;
            }
        }

        return { isWin: winAmount > 0, winAmount };
    }

    // Method to force a winning spin
    static spinWithWin(): Promise<SpinResult> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const board = this.generateWinningBoard();
                const { isWin, winAmount } = this.calculateWin(board);
                resolve({ board, isWin, winAmount });
            }, 500);
        });
    }

    // Method to set custom win probability
    static setWinProbability(probability: number) {
        if (probability >= 0 && probability <= 1) {
            (this.WIN_PROBABILITY as any) = probability;
        } else {
            console.error("Win probability must be between 0 and 1");
        }
    }
}