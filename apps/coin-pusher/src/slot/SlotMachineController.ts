import { SlotResolver, type SlotResult } from '../core/SlotResolver';

export class SlotMachineController {
  constructor(private readonly resolver = new SlotResolver()) {}

  spin(): SlotResult {
    return this.resolver.resolve();
  }
}
