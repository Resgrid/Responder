import ActivityKit
import Foundation
import React

@available(iOS 16.2, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {

    private var currentActivityId: String?

    @objc
    func startActivity(
        _ callData: NSDictionary,
        timerData: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("ACTIVITIES_DISABLED", "Live Activities are not enabled", nil)
            return
        }

        let callName = callData["callName"] as? String ?? ""
        let callNumber = callData["callNumber"] as? String ?? ""
        let callAddress = callData["callAddress"] as? String ?? ""
        let durationMinutes = callData["durationMinutes"] as? Int ?? 0

        let remainingMinutes = timerData["remainingMinutes"] as? Int ?? 0
        let timerStatus = timerData["timerStatus"] as? String ?? "Ok"
        let lastCheckInTime = timerData["lastCheckInTime"] as? String ?? ""

        let attributes = CallCheckInAttributes(
            callName: callName,
            callNumber: callNumber,
            callAddress: callAddress,
            durationMinutes: durationMinutes
        )

        let contentState = CallCheckInAttributes.ContentState(
            remainingMinutes: remainingMinutes,
            timerStatus: timerStatus,
            lastCheckInTime: lastCheckInTime
        )

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: contentState, staleDate: nil),
                pushType: nil
            )
            currentActivityId = activity.id
            resolve(nil)
        } catch {
            reject("START_FAILED", "Failed to start activity: \(error.localizedDescription)", error)
        }
    }

    @objc
    func updateActivity(
        _ contentState: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activityId = currentActivityId else {
            reject("NO_ACTIVITY", "No active Live Activity", nil)
            return
        }

        let remainingMinutes = contentState["remainingMinutes"] as? Int ?? 0
        let timerStatus = contentState["timerStatus"] as? String ?? "Ok"
        let lastCheckInTime = contentState["lastCheckInTime"] as? String ?? ""

        let state = CallCheckInAttributes.ContentState(
            remainingMinutes: remainingMinutes,
            timerStatus: timerStatus,
            lastCheckInTime: lastCheckInTime
        )

        Task {
            for activity in Activity<CallCheckInAttributes>.activities where activity.id == activityId {
                await activity.update(using: state)
                resolve(nil)
                return
            }
            reject("NOT_FOUND", "Activity not found", nil)
        }
    }

    @objc
    func endActivity(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activityId = currentActivityId else {
            resolve(nil)
            return
        }

        Task {
            for activity in Activity<CallCheckInAttributes>.activities where activity.id == activityId {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            currentActivityId = nil
            resolve(nil)
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
