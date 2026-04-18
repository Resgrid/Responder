import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.2, *)
struct CallCheckInLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CallCheckInAttributes.self) { context in
            // Lock Screen / Banner UI
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(context.attributes.callName)
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                    Text("#\(context.attributes.callNumber)")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }

                Text(context.attributes.callAddress)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
                    .lineLimit(1)

                HStack {
                    Circle()
                        .fill(statusColor(context.state.timerStatus))
                        .frame(width: 10, height: 10)

                    Text("\(context.state.remainingMinutes) min remaining")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)

                    Spacer()

                    Text(context.state.timerStatus)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(statusColor(context.state.timerStatus).opacity(0.3))
                        .cornerRadius(4)
                        .foregroundColor(.white)
                }
            }
            .padding()
            .background(Color(red: 0.14, green: 0.52, blue: 0.77))

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading) {
                        Text(context.attributes.callName)
                            .font(.headline)
                        Text(context.attributes.callAddress)
                            .font(.caption2)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing) {
                        Text("\(context.state.remainingMinutes)m")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(context.state.timerStatus)
                            .font(.caption2)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: progressValue(
                        remaining: context.state.remainingMinutes,
                        total: context.attributes.durationMinutes
                    ))
                    .tint(statusColor(context.state.timerStatus))
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Circle()
                        .fill(statusColor(context.state.timerStatus))
                        .frame(width: 8, height: 8)
                    Text("\(context.state.remainingMinutes)m")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
            } compactTrailing: {
                Text("#\(context.attributes.callNumber)")
                    .font(.caption2)
            } minimal: {
                Text("\(context.state.remainingMinutes)")
                    .font(.caption)
                    .fontWeight(.bold)
            }
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "Overdue":
            return .red
        case "Warning":
            return .orange
        default:
            return .green
        }
    }

    private func progressValue(remaining: Int, total: Int) -> Double {
        guard total > 0 else { return 0 }
        let elapsed = Double(total - remaining)
        return min(max(elapsed / Double(total), 0), 1)
    }
}
