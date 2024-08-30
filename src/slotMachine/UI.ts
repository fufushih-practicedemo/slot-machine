import { Container, Text, TextStyle } from 'pixi.js';

export class UI {
    container: Container;
    private balanceText: Text;
    private spinButton: Text;
    private winningText: Text | null = null;

    constructor(initialBalance: number, onSpinClick: () => void) {
        this.container = new Container();
        this.createBalanceText(initialBalance);
        this.createSpinButton(onSpinClick);
    }

    private createBalanceText(balance: number) {
        this.balanceText = new Text(`Balance: ${balance}`, new TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
        }));
        this.container.addChild(this.balanceText);
    }

    private createSpinButton(onSpinClick: () => void) {
        this.spinButton = new Text('SPIN', new TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
        }));
        this.spinButton.eventMode = 'static';
        this.spinButton.cursor = 'pointer';
        this.spinButton.on('pointerdown', onSpinClick);
        this.container.addChild(this.spinButton);
    }

    updateBalance(balance: number) {
        this.balanceText.text = `Balance: ${balance}`;
    }

    updateWinningDisplay(winnings: number) {
        if (this.winningText) {
            this.container.removeChild(this.winningText);
            this.winningText = null;
        }

        if (winnings > 0) {
            this.winningText = new Text(`You won: ${winnings}`, new TextStyle({
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xffff00,
                stroke: 0x000000,
            }));
            this.winningText.x = 400; // Adjust as needed
            this.winningText.y = -40;
            this.winningText.anchor.set(0.5);
            this.container.addChild(this.winningText);
        }
    }

    positionElements(totalWidth: number, totalHeight: number) {
        const padding = 20;
        this.balanceText.x = 0;
        this.balanceText.y = totalHeight + padding;

        this.spinButton.x = totalWidth - this.spinButton.width;
        this.spinButton.y = totalHeight + padding;
    }
}