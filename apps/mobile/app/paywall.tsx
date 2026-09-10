import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { TIER_PLANS, type SubscriptionTier, type TierPlan } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useSubscription } from '@/components/providers/subscription-provider'
import { apiFetch } from '@/lib/api'
import { DS, DS_SHADOW } from '@/lib/theme'

// Styled to the Kinnect design system's PLANS screen: light #f8f8fb surface,
// indigo gradient hero, white 24px cards with brand-tinted shadows, coral CTA.
//
// PayFast has no native SDK, so checkout is a web handoff: the server builds a
// signed URL and we open it in an in-app browser. The ITN webhook is what
// actually grants the tier, so the row may lag the browser closing.

const PAID_TIERS: SubscriptionTier[] = ['plus', 'family']

export default function PaywallScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const { tier: currentTier, refreshTier } = useSubscription()

  const [busyTier, setBusyTier] = useState<SubscriptionTier | null>(null)

  const isAdmin = user?.role === 'admin'

  // Never let this screen become a dead end: if there is nothing to go back to,
  // send the user home rather than leaving the close button inert.
  function handleClose() {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
  }

  async function handleUpgrade(tier: SubscriptionTier) {
    if (!isAdmin) {
      Alert.alert('Ask an admin', 'Only a family admin can change the plan.')
      return
    }

    setBusyTier(tier)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/payfast/checkout', {
        method: 'POST',
        body: { tier },
      })

      await WebBrowser.openBrowserAsync(url)
      await refreshTier()
    } catch (err) {
      Alert.alert(
        'Could not start checkout',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setBusyTier(null)
    }
  }

  return (
    <View style={styles.root}>
      {/* The root sets light status-bar content for the dark screens; this one
          is light-surfaced, so it needs dark glyphs to stay visible. */}
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          style={styles.close}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color={DS.inkMuted} />
        </TouchableOpacity>

        {/* Hero — the one gradient surface on the screen */}
        <LinearGradient
          colors={DS.bannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroPill}>
            <View style={styles.heroDot} />
            <Text style={styles.heroPillText}>KINNECT PREMIUM</Text>
          </View>
          <Text style={styles.heroTitle}>Keep the whole family in step</Text>
          <Text style={styles.heroSub}>
            More members, unlimited routines and instant sync — for one household price.
          </Text>
        </LinearGradient>

        {PAID_TIERS.map((t) => (
          <PlanCard
            key={t}
            plan={TIER_PLANS[t]}
            recommended={t === 'plus'}
            current={currentTier === t}
            busy={busyTier === t}
            disabled={busyTier !== null}
            onPress={() => handleUpgrade(t)}
          />
        ))}

        <FreeCard plan={TIER_PLANS.free} current={currentTier === 'free'} />

        <Text style={styles.legal}>
          Prices in ZAR and include VAT. POPIA compliant — we never sell your family's data.
        </Text>
      </ScrollView>
    </View>
  )
}

function PlanCard({
  plan,
  recommended,
  current,
  busy,
  disabled,
  onPress,
}: {
  plan: TierPlan
  recommended: boolean
  current: boolean
  busy: boolean
  disabled: boolean
  onPress: () => void
}) {
  return (
    <View style={[styles.card, recommended ? styles.cardRecommended : styles.cardPlain]}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadText}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planSub}>{plan.tagline}</Text>
        </View>
        {current ? (
          <View style={styles.badgeCurrent}>
            <Text style={styles.badgeCurrentText}>CURRENT</Text>
          </View>
        ) : recommended ? (
          <View style={styles.badgeRecommended}>
            <Text style={styles.badgeRecommendedText}>POPULAR</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>R{plan.price}</Text>
        <Text style={styles.period}>/month</Text>
      </View>

      <View style={styles.features}>
        {plan.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <View style={styles.checkChip}>
              <Ionicons name="checkmark" size={12} color={DS.green700} />
            </View>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {current ? (
        <View style={styles.currentBtn}>
          <Text style={styles.currentBtnText}>Your current plan</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.85}
            style={[styles.cta, disabled && styles.ctaDisabled]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.ctaText}>Choose {plan.name}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.ctaNote}>Billed securely via PayFast · Cancel anytime</Text>
        </>
      )}
    </View>
  )
}

function FreeCard({ plan, current }: { plan: TierPlan; current: boolean }) {
  return (
    <View style={[styles.card, styles.cardPlain]}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadText}>
          <Text style={styles.freeName}>{plan.name}</Text>
          <Text style={styles.planSub}>
            R0 · {current ? 'your current plan' : 'the essentials'}
          </Text>
        </View>
        {current && (
          <View style={styles.badgeCurrent}>
            <Text style={styles.badgeCurrentText}>CURRENT</Text>
          </View>
        )}
      </View>

      <View style={styles.featuresTight}>
        {plan.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <View style={styles.dashChip}>
              <Ionicons name="remove" size={11} color={DS.inkFaint} />
            </View>
            <Text style={styles.featureTextMuted}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.screen,
  },

  close: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },

  // ── Hero ────────────────────────────────────────────────────
  hero: {
    borderRadius: DS.radius.banner,
    paddingVertical: 22,
    paddingHorizontal: 18,
    ...DS_SHADOW.banner,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: DS.radius.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.coral,
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: DS.indigo100,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 28,
    marginTop: 14,
  },
  heroSub: {
    color: DS.indigo300,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 8,
  },

  // ── Cards ───────────────────────────────────────────────────
  card: {
    backgroundColor: DS.card,
    borderRadius: DS.radius.card,
    padding: 18,
    marginTop: 14,
  },
  cardPlain: DS_SHADOW.card,
  // The recommended plan is the only card carrying a border, per the
  // paywall design — elsewhere the system uses shadow alone.
  cardRecommended: {
    borderWidth: 2,
    borderColor: DS.coral,
    ...DS_SHADOW.cardRaised,
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardHeadText: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '800',
    color: DS.indigo600,
    letterSpacing: -0.34,
  },
  freeName: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.indigo600,
  },
  planSub: {
    fontSize: 12,
    color: DS.inkMuted,
    marginTop: 3,
    lineHeight: 17,
  },

  badgeRecommended: {
    backgroundColor: DS.coral100,
    borderRadius: DS.radius.badge,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  badgeRecommendedText: {
    color: DS.coral700,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badgeCurrent: {
    backgroundColor: DS.lavender,
    borderRadius: DS.radius.badge,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  badgeCurrentText: {
    color: DS.indigo500,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 12,
  },
  price: {
    fontSize: 34,
    fontWeight: '800',
    color: DS.indigo600,
    letterSpacing: -1,
    lineHeight: 38,
  },
  period: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.inkMuted,
  },

  features: {
    gap: 10,
    marginTop: 16,
  },
  featuresTight: {
    gap: 9,
    marginTop: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.neutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: DS.ink,
  },
  featureTextMuted: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: DS.inkMuted,
  },

  // ── Actions ─────────────────────────────────────────────────
  cta: {
    marginTop: 18,
    height: 48,
    borderRadius: DS.radius.button,
    backgroundColor: DS.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  ctaNote: {
    textAlign: 'center',
    fontSize: 11,
    color: DS.inkFaint,
    marginTop: 9,
  },

  currentBtn: {
    marginTop: 18,
    height: 48,
    borderRadius: DS.radius.button,
    backgroundColor: DS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.indigo600,
  },

  legal: {
    textAlign: 'center',
    fontSize: 11,
    color: DS.inkFaint,
    lineHeight: 18,
    marginTop: 16,
  },
})
