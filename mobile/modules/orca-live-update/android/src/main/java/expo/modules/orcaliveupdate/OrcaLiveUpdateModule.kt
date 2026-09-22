package expo.modules.orcaliveupdate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Posts one ongoing "agent lamps" notification: up to five segments, lit while the agent is
 * working and dark once it is done. On Android 16 QPR2+ it is promoted to a status-bar Live
 * Update chip showing the same lamps as text; older releases just show the notification.
 */
class OrcaLiveUpdateModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val manager: NotificationManager
    get() = context.getSystemService(NotificationManager::class.java)

  override fun definition() = ModuleDefinition {
    Name("OrcaLiveUpdate")

    Function("isSupported") { Build.VERSION.SDK_INT >= SUPPORTED_SDK }

    // Why swallow: a lamp is a glance aid; a notification-side failure (missing context during
    // teardown, an OEM NotificationManager quirk) must never take the app down with it.
    Function("update") { lamps: List<Boolean>, title: String, body: String ->
      if (Build.VERSION.SDK_INT >= SUPPORTED_SDK) {
        runCatching { post(lamps.take(MAX_LAMPS), title, body) }
          .onFailure { Log.w(TAG, "agent lamps update failed", it) }
      }
    }

    Function("clear") {
      runCatching { manager.cancel(NOTIFICATION_ID) }
        .onFailure { Log.w(TAG, "agent lamps clear failed", it) }
    }
  }

  private fun post(lamps: List<Boolean>, title: String, body: String) {
    if (lamps.isEmpty()) {
      manager.cancel(NOTIFICATION_ID)
      return
    }
    ensureChannel()
    val style = Notification.ProgressStyle()
      .setStyledByProgress(false)
      .setProgressSegments(
        lamps.map { lit ->
          Notification.ProgressStyle.Segment(1).setColor(if (lit) COLOR_LIT else COLOR_OFF)
        }
      )
    val builder = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon())
      .setContentTitle(title)
      .setContentText(body)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setStyle(style)
      .setShortCriticalText(lamps.joinToString("") { if (it) "●" else "○" })
    requestPromotedOngoing(builder)
    manager.notify(NOTIFICATION_ID, builder.build())
  }

  private fun ensureChannel() {
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Agent lamps", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Live status of the agents you are watching"
        setSound(null, null)
        enableVibration(false)
      }
    )
  }

  private fun smallIcon(): Int {
    val fromNotifications =
      context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (fromNotifications != 0) fromNotifications else context.applicationInfo.icon
  }

  // Why reflection: setRequestPromotedOngoing ships with SDK 36.1 (Android 16 QPR2) while the
  // app compiles against 36. Where the method is absent the notification stays a plain ongoing one.
  private fun requestPromotedOngoing(builder: Notification.Builder) {
    try {
      Notification.Builder::class.java
        .getMethod("setRequestPromotedOngoing", Boolean::class.javaPrimitiveType)
        .invoke(builder, true)
    } catch (_: ReflectiveOperationException) {
      // Pre-QPR2 device: no chip, notification only.
    }
  }

  private companion object {
    const val TAG = "OrcaLiveUpdate"
    const val SUPPORTED_SDK = 36
    const val MAX_LAMPS = 5
    const val CHANNEL_ID = "orca-agent-lamps"
    const val NOTIFICATION_ID = 0x0ACA
    val COLOR_LIT = Color.rgb(0x22, 0xC5, 0x5E)
    val COLOR_OFF = Color.rgb(0x52, 0x52, 0x5B)
  }
}
