import ActivityKit
import Foundation

struct CallCheckInAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var remainingMinutes: Int
        var timerStatus: String
        var lastCheckInTime: String
    }

    var callName: String
    var callNumber: String
    var callAddress: String
    var durationMinutes: Int
}
