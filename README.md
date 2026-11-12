# Axe Double Stun (Fabric 1.21.4, client-only)

Swing an axe at someone who's actively raising a shield, and ~2 client ticks
later this mod fires an automatic follow-up hit at them — giving you that
"double click" shield stun on top of your real click.

## How it works
- `AttackEntityCallback` (from Fabric API) fires right before vanilla's own
  attack code runs, every time you left-click an entity.
- If you're holding an axe (any `AxeItem`) and the target is a `LivingEntity`
  currently blocking (`isBlocking()`), the mod queues a synthetic second hit.
- On `ClientTickEvents.END_CLIENT_TICK`, after `FOLLOW_UP_DELAY_TICKS` (2 by
  default) it calls `interactionManager.attackEntity(...)` and swings your
  hand again — a real second attack, not just a visual effect.
- Safety checks: skips the follow-up if you swapped off the axe, the target
  died/left, or it's more than 6 blocks away.

## Building
1. Install a JDK 21.
2. From the project root: `./gradlew build` (or `gradlew.bat build` on
   Windows — you'll need to add the Gradle wrapper jar via
   `gradle wrapper --gradle-version 8.10` if it's not already present).
3. The built jar lands in `build/libs/axe-double-stun-1.0.0.jar`.
4. Drop it in your `.minecraft/mods` folder along with a matching Fabric API
   jar for 1.21.4, on Fabric Loader 0.16.9+.

## Toggling it in-game
Press **Right Shift** to turn it on/off — you'll see a confirmation on your
action bar. Rebind it anytime in **Options > Controls > Axe Double Stun**.
It's on by default when the game launches.

## Tuning it
- `FOLLOW_UP_DELAY_TICKS` in `AxeDoubleStunClient.java` controls how many
  ticks after your real hit the follow-up fires. Lower = feels more like a
  true double-click, higher = feels more like two separate swings.

## Important
This automates a second attack beyond what you actually clicked, which most
public PvP servers (Hypixel, etc.) classify as a macro / "no-delay" client
and will ban for. It's meant for singleplayer, LAN, or private servers where
you have permission to use it — check the rules of any server before running
this there.
