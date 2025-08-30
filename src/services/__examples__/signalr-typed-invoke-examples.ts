/**
 * Examples demonstrating the usage of the typed invoke method in SignalR service
 */

import { signalRService } from '../signalr.service';

// Define response types for different hub methods
interface UserResponse {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface CallResponse {
  callId: string;
  status: 'pending' | 'active' | 'completed';
  priority: number;
  timestamp: string;
}

interface GenericApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Example: Getting user information with typed response
 */
export async function getUserInfo(hubName: string, userId: number): Promise<UserResponse> {
  try {
    // The invoke method now returns typed results
    const user = await signalRService.invoke<UserResponse>(hubName, 'GetUserInfo', { userId });
    
    // TypeScript knows the return type is UserResponse
    console.log(`User ${user.name} (${user.email}) is ${user.isActive ? 'active' : 'inactive'}`);
    
    return user;
  } catch (error) {
    console.error('Failed to get user info:', error);
    throw error;
  }
}

/**
 * Example: Getting call details with typed response
 */
export async function getCallDetails(hubName: string, callId: string): Promise<CallResponse> {
  try {
    const call = await signalRService.invoke<CallResponse>(
      hubName,
      'GetCallDetails',
      { callId }
    );
    
    // TypeScript provides full intellisense for the response
    console.log(`Call ${call.callId} has status: ${call.status} with priority: ${call.priority}`);
    
    return call;
  } catch (error) {
    console.error('Failed to get call details:', error);
    throw error;
  }
}

/**
 * Example: Using generic wrapper response type
 */
export async function getWrappedUserData(hubName: string, userId: number): Promise<GenericApiResponse<UserResponse>> {
  try {
    const response = await signalRService.invoke<GenericApiResponse<UserResponse>>(
      hubName,
      'GetWrappedUserData',
      { userId }
    );
    
    if (response.success) {
      console.log(`Successfully retrieved user: ${response.data.name}`);
      console.log(`Response message: ${response.message}`);
    } else {
      console.warn(`API returned failure: ${response.message}`);
    }
    
    return response;
  } catch (error) {
    console.error('Failed to get wrapped user data:', error);
    throw error;
  }
}

/**
 * Example: When no specific type is needed (falls back to unknown)
 */
export async function sendGenericCommand(hubName: string, command: string, params: unknown): Promise<unknown> {
  try {
    // No type parameter specified, returns unknown
    const result = await signalRService.invoke(hubName, command, params);
    
    console.log('Command executed, result:', result);
    return result;
  } catch (error) {
    console.error('Command execution failed:', error);
    throw error;
  }
}

/**
 * Example: Void operations (no return value expected)
 */
export async function sendNotification(hubName: string, message: string, recipients: string[]): Promise<void> {
  try {
    // Explicitly specify void if no return value is expected
    await signalRService.invoke<void>(
      hubName,
      'SendNotification',
      { message, recipients }
    );
    
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

/**
 * Example: Handling arrays and complex nested types
 */
interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface Unit {
  id: string;
  name: string;
  status: string;
  location: Location;
  lastUpdate: string;
}

export async function getActiveUnits(hubName: string, departmentId: number): Promise<Unit[]> {
  try {
    const units = await signalRService.invoke<Unit[]>(
      hubName,
      'GetActiveUnits',
      { departmentId }
    );
    
    // TypeScript knows this is an array of Unit objects
    units.forEach(unit => {
      console.log(`Unit ${unit.name} at ${unit.location.address} - Status: ${unit.status}`);
    });
    
    return units;
  } catch (error) {
    console.error('Failed to get active units:', error);
    throw error;
  }
}
