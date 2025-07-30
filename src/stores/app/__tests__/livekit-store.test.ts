import { Platform } from 'react-native';
import { requestMultiple, check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

import { useLiveKitStore } from '../livekit-store';

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
	requestMultiple: jest.fn(),
	check: jest.fn(),
	request: jest.fn(),
	PERMISSIONS: {
		ANDROID: {
			RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
		},
		IOS: {
			MICROPHONE: 'ios.permission.MICROPHONE',
		},
	},
	RESULTS: {
		GRANTED: 'granted',
		DENIED: 'denied',
		BLOCKED: 'blocked',
		UNAVAILABLE: 'unavailable',
	},
}));

// Mock Platform
jest.mock('react-native', () => ({
	Platform: {
		OS: 'android',
	},
}));

// Mock other dependencies
jest.mock('@notifee/react-native', () => ({
	default: {
		registerForegroundService: jest.fn(),
		displayNotification: jest.fn(),
		stopForegroundService: jest.fn(),
	},
}));

jest.mock('livekit-client', () => ({
	Room: jest.fn().mockImplementation(() => ({
		connect: jest.fn(),
		disconnect: jest.fn(),
		on: jest.fn(),
		localParticipant: {
			setMicrophoneEnabled: jest.fn(),
			setCameraEnabled: jest.fn(),
			sid: 'local-participant-sid',
		},
	})),
	RoomEvent: {
		ParticipantConnected: 'participantConnected',
		ParticipantDisconnected: 'participantDisconnected',
		ActiveSpeakersChanged: 'activeSpeakersChanged',
	},
}));

jest.mock('../../../api/voice', () => ({
	getDepartmentVoiceSettings: jest.fn(),
	getCanConnectToVoiceSession: jest.fn(),
}));

jest.mock('../../../services/audio.service', () => ({
	audioService: {
		playConnectToAudioRoomSound: jest.fn(),
		playDisconnectedFromAudioRoomSound: jest.fn(),
	},
}));

jest.mock('../bluetooth-audio-store', () => ({
	useBluetoothAudioStore: {
		getState: jest.fn(() => ({
			selectedAudioDevices: {
				microphone: null,
				speaker: null,
			},
			connectedDevice: null,
			setSelectedMicrophone: jest.fn(),
			setSelectedSpeaker: jest.fn(),
		})),
	},
}));

describe('LiveKit Store - requestPermissions', () => {
	const mockRequestMultiple = requestMultiple as jest.MockedFunction<typeof requestMultiple>;
	const mockCheck = check as jest.MockedFunction<typeof check>;
	const mockRequest = request as jest.MockedFunction<typeof request>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Android', () => {
		beforeEach(() => {
			(Platform as any).OS = 'android';
		});

		it('should request audio recording permission successfully', async () => {
			mockRequestMultiple.mockResolvedValue({
				[PERMISSIONS.ANDROID.RECORD_AUDIO]: RESULTS.GRANTED,
			} as any);

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(mockRequestMultiple).toHaveBeenCalledWith([PERMISSIONS.ANDROID.RECORD_AUDIO]);
			expect(consoleSpy).toHaveBeenCalledWith('Audio recording permission granted successfully');
			expect(consoleSpy).toHaveBeenCalledWith('Foreground service permissions are handled at manifest level');

			consoleSpy.mockRestore();
		});

		it('should handle permission denial gracefully', async () => {
			mockRequestMultiple.mockResolvedValue({
				[PERMISSIONS.ANDROID.RECORD_AUDIO]: RESULTS.DENIED,
			} as any);

			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(mockRequestMultiple).toHaveBeenCalledWith([PERMISSIONS.ANDROID.RECORD_AUDIO]);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Permissions not granted', {
				[PERMISSIONS.ANDROID.RECORD_AUDIO]: RESULTS.DENIED,
			});

			consoleErrorSpy.mockRestore();
		});

		it('should handle permission request errors', async () => {
			const error = new Error('Permission request failed');
			mockRequestMultiple.mockRejectedValue(error);

			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to request permissions:', error);

			consoleErrorSpy.mockRestore();
		});
	});

	describe('iOS', () => {
		beforeEach(() => {
			(Platform as any).OS = 'ios';
		});

		it('should request microphone permission when not already granted', async () => {
			mockCheck.mockResolvedValue(RESULTS.DENIED as any);
			mockRequest.mockResolvedValue(RESULTS.GRANTED as any);

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(mockCheck).toHaveBeenCalledWith(PERMISSIONS.IOS.MICROPHONE);
			expect(mockRequest).toHaveBeenCalledWith(PERMISSIONS.IOS.MICROPHONE);
			expect(consoleSpy).toHaveBeenCalledWith('iOS microphone permission granted');

			consoleSpy.mockRestore();
		});

		it('should skip permission request when already granted', async () => {
			mockCheck.mockResolvedValue(RESULTS.GRANTED as any);

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(mockCheck).toHaveBeenCalledWith(PERMISSIONS.IOS.MICROPHONE);
			expect(mockRequest).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith('iOS microphone permission granted');

			consoleSpy.mockRestore();
		});

		it('should handle microphone permission denial', async () => {
			mockCheck.mockResolvedValue(RESULTS.DENIED as any);
			mockRequest.mockResolvedValue(RESULTS.DENIED as any);

			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(mockCheck).toHaveBeenCalledWith(PERMISSIONS.IOS.MICROPHONE);
			expect(mockRequest).toHaveBeenCalledWith(PERMISSIONS.IOS.MICROPHONE);
			expect(consoleErrorSpy).toHaveBeenCalledWith('Microphone permission not granted on iOS');

			consoleErrorSpy.mockRestore();
		});

		it('should handle iOS permission check errors', async () => {
			const error = new Error('Permission check failed');
			mockCheck.mockRejectedValue(error);

			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to request permissions:', error);

			consoleErrorSpy.mockRestore();
		});
	});

	describe('Other platforms', () => {
		beforeEach(() => {
			(Platform as any).OS = 'web';
		});

		it('should not request permissions on unsupported platforms', async () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await useLiveKitStore.getState().requestPermissions();

			expect(mockRequestMultiple).not.toHaveBeenCalled();
			expect(mockCheck).not.toHaveBeenCalled();
			expect(mockRequest).not.toHaveBeenCalled();
			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});
});

describe('LiveKit Store - microphone functionality', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset store state
		useLiveKitStore.setState({
			isConnected: false,
			currentRoom: null,
			isMicrophoneEnabled: false,
		});
	});

	it('should have correct initial microphone state', () => {
		const state = useLiveKitStore.getState();
		expect(state.isMicrophoneEnabled).toBe(false);
	});

	it('should not toggle microphone when not connected to a room', async () => {
		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

		await useLiveKitStore.getState().toggleMicrophone();

		expect(consoleSpy).toHaveBeenCalledWith('Cannot toggle microphone: not connected to a room');
		expect(useLiveKitStore.getState().isMicrophoneEnabled).toBe(false);

		consoleSpy.mockRestore();
	});

	it('should toggle microphone when connected to a room', async () => {
		const mockRoom = {
			localParticipant: {
				setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
			},
		};

		// Set up connected state
		useLiveKitStore.setState({
			isConnected: true,
			currentRoom: mockRoom as any,
			isMicrophoneEnabled: false,
		});

		const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

		// Toggle microphone on
		await useLiveKitStore.getState().toggleMicrophone();

		expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
		expect(useLiveKitStore.getState().isMicrophoneEnabled).toBe(true);
		expect(consoleSpy).toHaveBeenCalledWith('Microphone enabled');

		// Toggle microphone off
		await useLiveKitStore.getState().toggleMicrophone();

		expect(mockRoom.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
		expect(useLiveKitStore.getState().isMicrophoneEnabled).toBe(false);
		expect(consoleSpy).toHaveBeenCalledWith('Microphone disabled');

		consoleSpy.mockRestore();
	});

	it('should handle microphone toggle errors gracefully', async () => {
		const mockRoom = {
			localParticipant: {
				setMicrophoneEnabled: jest.fn().mockRejectedValue(new Error('Microphone error')),
			},
		};

		useLiveKitStore.setState({
			isConnected: true,
			currentRoom: mockRoom as any,
			isMicrophoneEnabled: false,
		});

		const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

		await useLiveKitStore.getState().toggleMicrophone();

		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to toggle microphone:', expect.any(Error));
		// State should not change on error
		expect(useLiveKitStore.getState().isMicrophoneEnabled).toBe(false);

		consoleErrorSpy.mockRestore();
	});

	it('should reset microphone state when disconnecting from room', async () => {
		const mockRoom = {
			disconnect: jest.fn(),
		};

		// Set up connected state with microphone enabled
		useLiveKitStore.setState({
			isConnected: true,
			currentRoom: mockRoom as any,
			isMicrophoneEnabled: true,
			currentRoomInfo: { Id: '1', Name: 'Test Room' } as any,
		});

		await useLiveKitStore.getState().disconnectFromRoom();

		expect(useLiveKitStore.getState().isMicrophoneEnabled).toBe(false);
		expect(useLiveKitStore.getState().isConnected).toBe(false);
		expect(useLiveKitStore.getState().currentRoom).toBeNull();
	});
});
