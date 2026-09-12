import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from '../../../components/ui/KeyboardAwareScrollView';
import { useAuthStore } from '../../../store/authStore';
import { postCaseToMarketplace } from '../services/caseService';
import { Colors } from '../../../utils/Colors';
import { CourtLevel, UrgencyLevel, BudgetType } from '../../../types/models';
import { postCaseInputSchema, CaseDraft } from '../../../types/schemas';

const DRAFT_VERSION = 1;

const CATEGORIES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Property / Real Estate Law', icon: 'home-outline' },
  { label: 'Family Law', icon: 'people-outline' },
  { label: 'Corporate Law', icon: 'business-outline' },
  { label: 'Criminal Law', icon: 'shield-outline' },
  { label: 'Civil Litigation', icon: 'document-text-outline' },
  { label: 'Labor & Employment', icon: 'briefcase-outline' },
];

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Multan', 'Faisalabad', 'Quetta', 'Other'];

const COURT_LEVELS: { id: CourtLevel; label: string; sub: string }[] = [
  { id: 'district', label: 'District Court', sub: 'Civil / Sessions' },
  { id: 'high_court', label: 'High Court', sub: 'LHC / SHC / IHC / PHC / BHC' },
  { id: 'supreme_court', label: 'Supreme Court', sub: 'Apex Appellate' },
  { id: 'tribunal', label: 'Special Tribunal', sub: 'Banking / Labor / Services' },
];

const URGENCY_OPTIONS: { id: UrgencyLevel; label: string; turnaround: string; badgeColor: string }[] = [
  { id: 'urgent', label: 'Urgent', turnaround: 'Target response: 24–48 hours', badgeColor: '#DC2626' },
  { id: 'standard', label: 'Standard', turnaround: 'Target response: 3–7 days', badgeColor: Colors.primary },
  { id: 'flexible', label: 'Flexible / Advisory', turnaround: 'Open timeline / Legal opinion', badgeColor: '#059669' },
];

const BUDGET_PRESETS = [15000, 30000, 50000, 100000];

export const PostCaseScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const draftStorageKey = user ? `@haqooq_case_draft_${user.id}` : null;

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Property / Real Estate Law');
  const [city, setCity] = useState<string>('Lahore');
  const [jurisdictionCity, setJurisdictionCity] = useState<string>('Lahore');
  const [courtLevel, setCourtLevel] = useState<CourtLevel>('district');
  const [urgency, setUrgency] = useState<UrgencyLevel>('standard');
  const [budgetType, setBudgetType] = useState<BudgetType>('open_to_quotes');
  const [budgetString, setBudgetString] = useState('');

  // UX & Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedCaseSummary, setPublishedCaseSummary] = useState<{ title: string; category: string; city: string; turnaround: string } | null>(null);

  // Draft Auto-Restore on Mount
  useEffect(() => {
    let isMounted = true;
    const restoreDraft = async () => {
      if (!draftStorageKey) return;
      try {
        const raw = await AsyncStorage.getItem(draftStorageKey);
        if (!raw) return;
        const draft: CaseDraft = JSON.parse(raw);
        if (draft.version === DRAFT_VERSION && draft.userId === user?.id && draft.data) {
          if (!isMounted) return;
          const d = draft.data;
          if (d.title) setTitle(d.title);
          if (d.description) setDescription(d.description);
          if (d.category) setSelectedCategory(d.category);
          if (d.city) setCity(d.city);
          if (d.jurisdictionCity) setJurisdictionCity(d.jurisdictionCity);
          if (d.courtLevel) setCourtLevel(d.courtLevel);
          if (d.urgency) setUrgency(d.urgency);
          if (d.budgetType) setBudgetType(d.budgetType);
          if (d.budgetAmount) setBudgetString(d.budgetAmount.toLocaleString());
          setHasDraftRestored(true);
        }
      } catch (e) {
        // Gracefully handle corrupted draft JSON
        console.warn('[Draft] Failed to restore draft:', e);
      }
    };
    restoreDraft();
    return () => { isMounted = false; };
  }, [draftStorageKey, user?.id]);

  // Debounced Local Draft Autosave (Zero network leak)
  useEffect(() => {
    if (!draftStorageKey) return;
    const timer = setTimeout(async () => {
      // Only save if user has entered meaningful content
      if (!title.trim() && !description.trim()) return;
      try {
        const parsedBudget = budgetType === 'fixed' && budgetString.trim() ? parseInt(budgetString.replace(/,/g, ''), 10) : undefined;
        const draft: CaseDraft = {
          version: DRAFT_VERSION,
          userId: user!.id,
          updatedAt: Date.now(),
          data: {
            title,
            description,
            category: selectedCategory,
            city,
            jurisdictionCity,
            courtLevel,
            urgency,
            budgetType,
            budgetAmount: parsedBudget && !isNaN(parsedBudget) ? parsedBudget : undefined
          }
        };
        await AsyncStorage.setItem(draftStorageKey, JSON.stringify(draft));
      } catch (e) {
        console.warn('[Draft] Autosave error:', e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, description, selectedCategory, city, jurisdictionCity, courtLevel, urgency, budgetType, budgetString, draftStorageKey, user]);

  const clearDraft = async () => {
    if (draftStorageKey) {
      try {
        await AsyncStorage.removeItem(draftStorageKey);
      } catch (e) {}
    }
    setTitle('');
    setDescription('');
    setSelectedCategory('Property / Real Estate Law');
    setCity('Lahore');
    setJurisdictionCity('Lahore');
    setCourtLevel('district');
    setUrgency('standard');
    setBudgetType('open_to_quotes');
    setBudgetString('');
    setErrors({});
    setHasDraftRestored(false);
  };

  const handleBudgetChange = (text: string) => {
    // Strip non-digits
    const clean = text.replace(/[^0-9]/g, '');
    if (!clean) {
      setBudgetString('');
      return;
    }
    const num = parseInt(clean, 10);
    setBudgetString(num.toLocaleString());
    if (errors.budgetAmount) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.budgetAmount;
        return next;
      });
    }
  };

  const handlePresetSelect = (amount: number) => {
    setBudgetType('fixed');
    setBudgetString(amount.toLocaleString());
    if (errors.budgetAmount) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.budgetAmount;
        return next;
      });
    }
  };

  const handlePostListing = async () => {
    setErrors({});

    const parsedBudget = budgetType === 'fixed' && budgetString.trim()
      ? parseInt(budgetString.replace(/,/g, ''), 10)
      : undefined;

    const validationResult = postCaseInputSchema.safeParse({
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
      city: city.trim(),
      jurisdictionCity: jurisdictionCity.trim(),
      courtLevel,
      urgency,
      budgetType,
      budgetAmount: parsedBudget
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach(issue => {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await postCaseToMarketplace({
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        city: city.trim(),
        jurisdictionCity: jurisdictionCity.trim(),
        courtLevel,
        urgency,
        budgetType,
        budgetAmount: parsedBudget
      });

      // Clear draft on successful publication
      if (draftStorageKey) {
        await AsyncStorage.removeItem(draftStorageKey);
      }

      const turnaroundLabel = URGENCY_OPTIONS.find(u => u.id === urgency)?.turnaround || 'Target response: 3–7 days';
      setPublishedCaseSummary({
        title: title.trim(),
        category: selectedCategory,
        city: jurisdictionCity.trim(),
        turnaround: turnaroundLabel
      });

      // Reset form states
      setTitle('');
      setDescription('');
      setSelectedCategory('Property / Real Estate Law');
      setCity('Lahore');
      setJurisdictionCity('Lahore');
      setCourtLevel('district');
      setUrgency('standard');
      setBudgetType('open_to_quotes');
      setBudgetString('');
      setErrors({});
      setHasDraftRestored(false);

      setShowSuccessModal(true);
    } catch (error: any) {
      setErrors({ form: error?.message || 'Unable to publish listing. Please check connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={50}
      >
          {/* Header & Substantiated Trustmarks */}
          <View style={styles.headerContainer}>
            <View style={styles.headerTopRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="document-text" size={24} color={Colors.primary} />
              </View>
              <View style={styles.headerBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.headerBadgeText}>Bar-Verified Intake</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Post a Legal Matter</Text>
            <Text style={styles.subtext}>
              Publish your matter directly to licensed advocates across Pakistan. Verified lawyers review your brief and submit competitive proposals.
            </Text>

            {/* Factual Trust Indicators */}
            <View style={styles.trustmarksContainer}>
              <View style={styles.trustItem}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.primary} />
                <Text style={styles.trustItemText}>Private Details</Text>
              </View>
              <View style={styles.trustItemDivider} />
              <View style={styles.trustItem}>
                <Ionicons name="ribbon-outline" size={16} color={Colors.primary} />
                <Text style={styles.trustItemText}>Verified Advocates</Text>
              </View>
              <View style={styles.trustItemDivider} />
              <View style={styles.trustItem}>
                <Ionicons name="chatbubbles-outline" size={16} color={Colors.primary} />
                <Text style={styles.trustItemText}>Direct In-App Chat</Text>
              </View>
            </View>
          </View>

          {/* Draft Restored Banner */}
          {hasDraftRestored && (
            <View style={styles.draftBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="bookmark-outline" size={18} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={styles.draftBannerText}>Restored your previous draft</Text>
              </View>
              <TouchableOpacity onPress={clearDraft} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.clearDraftBtn}>Discard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Top-Level Form Error */}
          {errors.form && (
            <View style={styles.formErrorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          )}

          {/* SECTION 1: Practice Area */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>1. Legal Practice Area</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <Text style={styles.sectionHint}>Select the practice area matching your legal situation</Text>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                    onPress={() => setSelectedCategory(cat.label)}
                    activeOpacity={0.75}
                  >
                    <Ionicons 
                      name={cat.icon} 
                      size={20} 
                      color={isSelected ? '#FFFFFF' : Colors.primary} 
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={[styles.categoryCardText, isSelected && styles.categoryCardTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.category && <Text style={styles.inlineErrorText}>{errors.category}</Text>}
          </Card>

          {/* SECTION 2: Jurisdiction & Court Forum */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>2. Jurisdiction & Court Forum</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <Text style={styles.sectionHint}>Specify where the legal matter is located or will be contested</Text>

            {/* Matter Jurisdiction City */}
            <Text style={styles.subFieldLabel}>Matter / Court Jurisdiction City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChipsScroll} contentContainerStyle={{ gap: 8 }}>
              {CITIES.map((c) => {
                const isSelected = jurisdictionCity === c;
                return (
                  <TouchableOpacity
                    key={`jurisdiction-${c}`}
                    style={[styles.chipPill, isSelected && styles.chipPillActive]}
                    onPress={() => {
                      setJurisdictionCity(c);
                      if (errors.jurisdictionCity) {
                        setErrors(prev => { const n = { ...prev }; delete n.jurisdictionCity; return n; });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name="location-outline" 
                      size={14} 
                      color={isSelected ? '#FFFFFF' : Colors.textSecondary} 
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.chipPillText, isSelected && styles.chipPillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {errors.jurisdictionCity && <Text style={styles.inlineErrorText}>{errors.jurisdictionCity}</Text>}

            {/* Client City Sync */}
            <View style={styles.syncRow}>
              <Text style={styles.subFieldLabel}>Your Current Location: <Text style={{ fontWeight: '700', color: Colors.text }}>{city}</Text></Text>
              <TouchableOpacity 
                onPress={() => setCity(jurisdictionCity)} 
                style={styles.syncButton}
              >
                <Text style={styles.syncButtonText}>Same as Court</Text>
              </TouchableOpacity>
            </View>

            {/* Court Forum Level */}
            <Text style={[styles.subFieldLabel, { marginTop: 12 }]}>Anticipated Forum / Court Level</Text>
            <View style={styles.courtLevelContainer}>
              {COURT_LEVELS.map((forum) => {
                const isSelected = courtLevel === forum.id;
                return (
                  <TouchableOpacity
                    key={forum.id}
                    style={[styles.courtOption, isSelected && styles.courtOptionActive]}
                    onPress={() => setCourtLevel(forum.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.courtOptionTitle, isSelected && styles.courtOptionTitleActive]}>
                        {forum.label}
                      </Text>
                      <Text style={styles.courtOptionSub}>{forum.sub}</Text>
                    </View>
                    <Ionicons 
                      name={isSelected ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={isSelected ? Colors.primary : Colors.border} 
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* SECTION 3: Urgency & Target Turnaround */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>3. Target Response Turnaround</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>
            <Text style={styles.sectionHint}>Informs advocates of your expected engagement timeline</Text>

            <View style={styles.urgencyContainer}>
              {URGENCY_OPTIONS.map((opt) => {
                const isSelected = urgency === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.urgencyCard, isSelected && { borderColor: opt.badgeColor, backgroundColor: '#FAFAFA' }]}
                    onPress={() => setUrgency(opt.id)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.urgencyDot, { backgroundColor: opt.badgeColor }]} />
                        <Text style={[styles.urgencyLabel, isSelected && { color: opt.badgeColor, fontWeight: '700' }]}>
                          {opt.label}
                        </Text>
                      </View>
                      <Ionicons 
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                        size={18} 
                        color={isSelected ? opt.badgeColor : Colors.border} 
                      />
                    </View>
                    <Text style={styles.urgencyTurnaround}>{opt.turnaround}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* SECTION 4: Matter Details & Guided Scaffolding */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>4. Matter Details & Facts</Text>
              <Text style={styles.requiredStar}>*</Text>
            </View>

            {/* Title Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Matter Title</Text>
                <Text style={[styles.charCounter, title.length > 100 && { color: '#DC2626' }]}>
                  {title.length}/100
                </Text>
              </View>
              <KeyboardAwareTextInput
                style={[styles.textInput, errors.title ? styles.inputErrorBorder : null]}
                placeholder="e.g. Property Boundary & Inheritance Dispute in Gulberg"
                placeholderTextColor={Colors.textSecondary}
                value={title}
                maxLength={100}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errors.title) setErrors(prev => { const n = { ...prev }; delete n.title; return n; });
                }}
              />
              {errors.title && <Text style={styles.inlineErrorText}>{errors.title}</Text>}
            </View>

            {/* Scaffolding Guidance Checklist */}
            <View style={styles.scaffoldingBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="bulb-outline" size={16} color="#B45309" style={{ marginRight: 6 }} />
                <Text style={styles.scaffoldingTitle}>Helpful Details Advocates Look For:</Text>
              </View>
              <Text style={styles.scaffoldingBullet}>• Approximate timeline of events & current stage (FIR, notice, suit)</Text>
              <Text style={styles.scaffoldingBullet}>• Parties involved (individual, private company, department)</Text>
              <Text style={styles.scaffoldingBullet}>• What relief or document assistance you require</Text>
              <View style={styles.privacyReminder}>
                <Ionicons name="information-circle-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.privacyReminderText}>Do not include CNIC, phone numbers, or bank details here.</Text>
              </View>
            </View>

            {/* Description Multiline Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Detailed Brief</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {description.trim().length >= 25 && (
                    <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.charCounter, description.length > 2500 && { color: '#DC2626' }]}>
                    {description.length}/2500 (min 25)
                  </Text>
                </View>
              </View>
              <KeyboardAwareTextInput
                style={[styles.textArea, errors.description ? styles.inputErrorBorder : null]}
                placeholder="Explain the background, key dates, opposite party, and what action you need taken..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={6}
                maxLength={2500}
                textAlignVertical="top"
                value={description}
                onChangeText={(d) => {
                  setDescription(d);
                  if (errors.description) setErrors(prev => { const n = { ...prev }; delete n.description; return n; });
                }}
              />
              {errors.description && <Text style={styles.inlineErrorText}>{errors.description}</Text>}
            </View>
          </Card>

          {/* SECTION 5: Canonical Numeric Budget */}
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>5. Estimated Budget (PKR)</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <Text style={styles.sectionHint}>Specify your expected fee range or allow advocates to provide proposals</Text>

            {/* Segmented Control */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, budgetType === 'open_to_quotes' && styles.segmentBtnActive]}
                onPress={() => {
                  setBudgetType('open_to_quotes');
                  setBudgetString('');
                  if (errors.budgetAmount) setErrors(prev => { const n = { ...prev }; delete n.budgetAmount; return n; });
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="chatbubble-ellipses-outline" 
                  size={16} 
                  color={budgetType === 'open_to_quotes' ? '#FFFFFF' : Colors.textSecondary} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.segmentBtnText, budgetType === 'open_to_quotes' && styles.segmentBtnTextActive]}>
                  Open to Quotes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, budgetType === 'fixed' && styles.segmentBtnActive]}
                onPress={() => setBudgetType('fixed')}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="cash-outline" 
                  size={16} 
                  color={budgetType === 'fixed' ? '#FFFFFF' : Colors.textSecondary} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.segmentBtnText, budgetType === 'fixed' && styles.segmentBtnTextActive]}>
                  Fixed Budget
                </Text>
              </TouchableOpacity>
            </View>

            {/* Fixed Budget Fields & Presets */}
            {budgetType === 'fixed' && (
              <View style={{ marginTop: 14 }}>
                {/* Presets */}
                <Text style={styles.subFieldLabel}>Quick Presets:</Text>
                <View style={styles.presetChipsContainer}>
                  {BUDGET_PRESETS.map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.presetChip, budgetString === amt.toLocaleString() && styles.presetChipActive]}
                      onPress={() => handlePresetSelect(amt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetChipText, budgetString === amt.toLocaleString() && styles.presetChipTextActive]}>
                        PKR {amt.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Budget Input */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.subFieldLabel}>Custom Budget Amount (PKR)</Text>
                  <View style={styles.budgetInputContainer}>
                    <Text style={styles.currencyPrefix}>PKR</Text>
                    <KeyboardAwareTextInput
                      style={[styles.budgetInput, errors.budgetAmount ? styles.inputErrorBorder : null]}
                      placeholder="e.g. 50,000"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                      value={budgetString}
                      onChangeText={handleBudgetChange}
                    />
                  </View>
                  {errors.budgetAmount && <Text style={styles.inlineErrorText}>{errors.budgetAmount}</Text>}
                </View>
              </View>
            )}
          </Card>

          {/* Submit Action */}
          <Button
            title="Publish Listing to Advocates"
            onPress={handlePostListing}
            isLoading={isSubmitting}
            style={styles.submitBtn}
          />
        </KeyboardAwareScrollView>

      {/* Lightweight Native Success Confirmation Sheet */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successSheet}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-done" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.successSheetTitle}>Matter Published</Text>
            <Text style={styles.successSheetSub}>
              Your listing is now active in the advocate marketplace.
            </Text>

            {publishedCaseSummary && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Matter:</Text>
                  <Text style={styles.summaryVal} numberOfLines={1}>{publishedCaseSummary.title}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Practice Area:</Text>
                  <Text style={styles.summaryVal}>{publishedCaseSummary.category}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Jurisdiction:</Text>
                  <Text style={styles.summaryVal}>{publishedCaseSummary.city}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Target Response:</Text>
                  <Text style={[styles.summaryVal, { color: Colors.primary, fontWeight: '700' }]}>{publishedCaseSummary.turnaround}</Text>
                </View>
              </View>
            )}

            <Button
              title="Track in My Cases"
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('Cases');
              }}
              style={{ width: '100%', marginBottom: 10 }}
            />

            <TouchableOpacity
              onPress={() => setShowSuccessModal(false)}
              style={styles.doneBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.doneBtnText}>Post Another Matter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  trustmarksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  trustItemDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  draftBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  clearDraftBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    textDecorationLine: 'underline',
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  formErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  card: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  requiredStar: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 4,
  },
  optionalBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  categoryCardTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  horizontalChipsScroll: {
    marginBottom: 10,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  chipPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  syncButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  courtLevelContainer: {
    gap: 8,
  },
  courtOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  courtOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
  },
  courtOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  courtOptionTitleActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  courtOptionSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  urgencyContainer: {
    gap: 8,
  },
  urgencyCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  urgencyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  urgencyTurnaround: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    marginLeft: 16,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  charCounter: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.text,
    height: 115,
  },
  inputErrorBorder: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  inlineErrorText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#DC2626',
    marginTop: 4,
  },
  scaffoldingBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  scaffoldingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  scaffoldingBullet: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 2,
  },
  privacyReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  privacyReminderText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#059669',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presetChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginRight: 6,
  },
  budgetInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  submitBtn: {
    marginTop: 4,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  successSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successSheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  successSheetSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: '65%',
    textAlign: 'right',
  },
  doneBtn: {
    paddingVertical: 10,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
