package com.example.axedoublestun;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.event.player.AttackEntityCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import net.minecraft.entity.Entity;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.AxeItem;
import net.minecraft.item.ItemStack;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Hand;
import org.lwjgl.glfw.GLFW;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Client-side mod: when you hit an entity that is actively blocking with a
 * shield while holding an axe, this schedules a quick follow-up attack a
 * couple of client ticks later, effectively "double-clicking" the shield
 * disable.
 *
 * NOTE: Most public multiplayer servers treat automated follow-up clicks
 * like this as a macro / no-delay client and may ban you for using it.
 * This is intended for singleplayer, LAN, or private servers where you
 * have permission to use it.
 */
public class AxeDoubleStunClient implements ClientModInitializer {

    /** How many client ticks to wait before firing the follow-up hit. */
    private static final int FOLLOW_UP_DELAY_TICKS = 2;

    /** On/off switch, flipped by the keybind below. Defaults to on. */
    public static boolean enabled = true;

    private KeyBinding toggleKey;

    private final Deque<ScheduledHit> scheduledHits = new ArrayDeque<>();

    @Override
    public void onInitializeClient() {
        // Fires just before vanilla's own attack logic runs.
        AttackEntityCallback.EVENT.register(this::onAttackEntity);

        // Drains the queue of pending follow-up hits every client tick.
        ClientTickEvents.END_CLIENT_TICK.register(this::onClientTick);

        // Default: Right Shift. Rebindable in-game under Controls > Axe Double Stun.
        toggleKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
                "key.axe-double-stun.toggle",
                InputUtil.Type.KEYSYM,
                GLFW.GLFW_KEY_RIGHT_SHIFT,
                "category.axe-double-stun"
        ));

        ClientTickEvents.END_CLIENT_TICK.register(this::onToggleKeyTick);
    }

    private void onToggleKeyTick(MinecraftClient client) {
        if (toggleKey.wasPressed()) {
            enabled = !enabled;
            if (client.player != null) {
                client.player.sendMessage(
                        Text.literal("Axe Double Stun: " + (enabled ? "ON" : "OFF")),
                        true // action bar, not chat
                );
            }
        }
    }

    private ActionResult onAttackEntity(PlayerEntity player, net.minecraft.world.World world, Hand hand, Entity target, net.minecraft.util.hit.EntityHitResult hitResult) {
        if (!enabled) {
            return ActionResult.PASS;
        }

        // Only care about the main hand attack (that's what a real left-click swings with).
        if (hand != Hand.MAIN_HAND) {
            return ActionResult.PASS;
        }

        if (!isHoldingAxe(player)) {
            return ActionResult.PASS;
        }

        if (!(target instanceof LivingEntity livingTarget) || !livingTarget.isBlocking()) {
            return ActionResult.PASS;
        }

        // Queue the follow-up hit; let vanilla's own attack logic still run normally this click.
        scheduledHits.add(new ScheduledHit(target, FOLLOW_UP_DELAY_TICKS));

        return ActionResult.PASS;
    }

    private void onClientTick(MinecraftClient client) {
        if (scheduledHits.isEmpty() || client.player == null || client.interactionManager == null) {
            return;
        }

        int size = scheduledHits.size();
        for (int i = 0; i < size; i++) {
            ScheduledHit hit = scheduledHits.poll();
            if (hit == null) {
                continue;
            }

            hit.ticksRemaining--;

            if (hit.ticksRemaining > 0) {
                scheduledHits.add(hit);
                continue;
            }

            fireFollowUpHit(client, hit.target);
        }
    }

    private void fireFollowUpHit(MinecraftClient client, Entity target) {
        if (target == null || !target.isAlive()) {
            return;
        }
        if (client.player == null || client.crosshairTarget == null) {
            return;
        }
        // Don't bother if the axe got swapped out in the meantime.
        if (!isHoldingAxe(client.player)) {
            return;
        }
        // Basic sanity range check so we don't attack through walls / from across the map.
        double distanceSq = client.player.squaredDistanceTo(target);
        if (distanceSq > 36.0) { // 6 blocks
            return;
        }

        client.interactionManager.attackEntity(client.player, target);
        client.player.swingHand(Hand.MAIN_HAND);
    }

    private boolean isHoldingAxe(PlayerEntity player) {
        ItemStack mainHand = player.getMainHandStack();
        return mainHand.getItem() instanceof AxeItem;
    }

    private static class ScheduledHit {
        final Entity target;
        int ticksRemaining;

        ScheduledHit(Entity target, int ticksRemaining) {
            this.target = target;
            this.ticksRemaining = ticksRemaining;
        }
    }
}
