import { SlotMachine } from './slotMachine';

// Asynchronous IIFE
(async () => {
    const slotMachine = new SlotMachine();
    await slotMachine.init();
})();