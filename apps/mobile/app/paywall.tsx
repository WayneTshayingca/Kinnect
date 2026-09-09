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
import * as WebBrowser from 'expo-web-browser'
import { TIER_PLANS, type SubscriptionTier, type TierPlan } from '@kinnect/core'
import { useUser } from '@/components/providers/user-provider'
import { useSubscription } from '@/components/providers/subscription-provider'
import { apiFetch } from '@/lib/api'
import { C } from '@/lib/authTheme'

// PayFast has no native SDK, so checkout is a web handoff: the server builds a
// signed URL and we open it in an in-app browser. On return we refetch the
// tier — the ITN webhook is what actually grants it, so the row may lag a
// moment behind the browser closing.

const PAID_TIERS: SubscriptionTier[] = ['plus', 'family']

export default function PaywallScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useUser()
  const { tier: currentTier, refreshTier } = useSubscription()

  const [busyTier, setBusyTier] = useState<SubscriptionTier | null>(null)

  const isAdmin = user?.role === 'admin'

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
      // The webhook may not have landed yet; refetch and let the screen settle.
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
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          style={styles.close}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={C.mutedDim} />
        </TouchableOpacity>

        <Text style={styles.headline}>More room for</Text>
        <Text style={styles.headlineAccent}>everyone.</Text>
        <Text style={styles.subtitle}>
          Kinnect stays free for one household. Upgrade when your family grows past it —
          more people, more routines, instant sync.
        </Text>

        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            You're on {TIER_PLANS[currentTier].name}
          </Text>
        </View>

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

        <Text style={styles.footnote}>
          Billed monthly in rand through PayFast. Cancel any time from Settings — you keep
          your plan until the end of the month you've paid for.
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
    <View style={[styles.card, recommended && styles.cardRecommended]}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadText}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planTagline}>{plan.tagline}</Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.currency}>R</Text>
          <Text style={[styles.price, recommended && styles.priceAccent]}>{plan.price}</Text>
        </View>
      </View>
      <Text style={styles.period}>per month</Text>

      <View style={styles.features}>
        {plan.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons
              name="checkmark"
              size={15}
              color={recommended ? C.coral : C.mutedDim}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {current ? (
        <View style={styles.currentBtn}>
          <Text style={styles.currentText}>Your current plan</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.88}
          style={[
            styles.cta,
            recommended ? styles.ctaPrimary : styles.ctaSecondary,
            disabled && styles.ctaDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={recommended ? C.white : C.coral} size="small" />
          ) : (
            <Text style={[styles.ctaText, !recommended && styles.ctaTextSecondary]}>
              Choose {plan.name}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  glowTop: {
    position: 'absolute',
    top: -80,
    right: -90,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: C.indigo,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: C.coralDim,
    opacity: 0.45,
  },

  close: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },

  headline: {
    fontSize: 34,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -1.2,
    lineHeight: 38,
  },
  headlineAccent: {
    fontSize: 34,
    fontWeight: '900',
    color: C.coral,
    letterSpacing: -1.2,
    lineHeight: 38,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 21,
    maxWidth: 330,
    marginBottom: 24,
  },

  // Current plan reads as a status line, not another card.
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.coral,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.mutedDim,
  },

  card: {
    backgroundColor: C.glass,
    borderWidth: 1,
    borderColor: C.glassBorder,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  // Only the recommended plan gets lift — the other stays flat.
  cardRecommended: {
    borderColor: 'rgba(251,113,133,0.45)',
    backgroundColor: 'rgba(251,113,133,0.07)',
    shadowColor: C.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardHeadText: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.3,
  },
  planTagline: {
    fontSize: 12.5,
    color: C.mutedDim,
    marginTop: 3,
    lineHeight: 17,
  },

  // The price numeral is the one bold element on the screen.
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currency: {
    fontSize: 15,
    fontWeight: '700',
    color: C.mutedDim,
    marginTop: 6,
    marginRight: 1,
  },
  price: {
    fontSize: 40,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -2,
    lineHeight: 44,
  },
  priceAccent: {
    color: C.coral,
  },
  period: {
    fontSize: 12,
    color: C.mutedDim,
    textAlign: 'right',
    marginTop: -4,
  },

  features: {
    marginTop: 16,
    gap: 9,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  featureIcon: {
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 19,
  },

  cta: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  ctaPrimary: {
    backgroundColor: C.coral,
  },
  ctaSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(251,113,133,0.5)',
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -0.2,
  },
  ctaTextSecondary: {
    color: C.coral,
  },

  currentBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  currentText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.mutedDim,
  },

  footnote: {
    fontSize: 11.5,
    color: C.mutedDim,
    lineHeight: 17,
    marginTop: 6,
  },
})
