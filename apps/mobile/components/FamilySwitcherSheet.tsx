import { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getMyFamilies, switchActiveFamily, type MyFamily } from '@kinnect/core'

interface FamilySwitcherSheetProps {
  visible: boolean
  onClose: () => void
  onSwitched: () => void
}

export function FamilySwitcherSheet({ visible, onClose, onSwitched }: FamilySwitcherSheetProps) {
  const [families, setFamilies] = useState<MyFamily[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    getMyFamilies()
      .then(setFamilies)
      .catch(() => setFamilies([]))
      .finally(() => setLoading(false))
  }, [visible])

  async function handleSwitch(familyId: string, isActive: boolean) {
    if (isActive || switching) return
    setSwitching(familyId)
    try {
      await switchActiveFamily(familyId)
      onSwitched()
      onClose()
    } finally {
      setSwitching(null)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl pb-8 pt-2 px-4" onPress={(e) => e.stopPropagation()}>
          <View className="w-10 h-1.5 rounded-full bg-primary-100 self-center my-3" />
          <Text className="text-xs font-bold uppercase tracking-wide text-primary-300 px-2 mb-2">
            Your families
          </Text>

          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#312E81" />
            </View>
          ) : (
            <View className="gap-1">
              {families.map((f) => (
                <TouchableOpacity
                  key={f.family_id}
                  activeOpacity={0.7}
                  disabled={f.is_active || !!switching}
                  onPress={() => handleSwitch(f.family_id, f.is_active)}
                  className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 ${f.is_active ? 'bg-primary-50' : ''}`}
                >
                  <View className="w-10 h-10 rounded-xl bg-primary-800 items-center justify-center">
                    <Text className="text-white font-extrabold">
                      {f.family_name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-primary-600">{f.family_name}</Text>
                    <Text className="text-xs text-primary-300 capitalize">{f.role}</Text>
                  </View>
                  {switching === f.family_id ? (
                    <ActivityIndicator color="#312E81" size="small" />
                  ) : f.is_active ? (
                    <Ionicons name="checkmark-circle" size={22} color="#312E81" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
