import { callKeepService } from '../callkeep.service';

describe('CallKeep Service Platform Resolution', () => {
  it('should import callKeepService without errors', () => {
    expect(callKeepService).toBeDefined();
    expect(typeof callKeepService.setup).toBe('function');
    expect(typeof callKeepService.cleanup).toBe('function');
  });

  it('should have the correct interface', () => {
    expect(typeof callKeepService.startCall).toBe('function');
    expect(typeof callKeepService.endCall).toBe('function');
    expect(typeof callKeepService.isCallActiveNow).toBe('function');
    expect(typeof callKeepService.getCurrentCallUUID).toBe('function');
    expect(typeof callKeepService.setMuteStateCallback).toBe('function');
  });
});
