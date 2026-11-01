import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  Wifi,
  Receipt,
  Sliders,
  Bell,
  Shield,
  Save,
  Clock,
  QrCode,
  Sparkles,
  ExternalLink,
  Upload,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Switch } from '../components/ui/Switch'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { useRestaurantStore } from '../store/useRestaurantStore'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { dashboardApi } from '../services/api'

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    settings,
    updateProfile,
    updateWifi,
    updateBilling,
    updateOrderPreferences,
    updateNotifications,
  } = useRestaurantStore()

  const initialTab = searchParams.get('tab') || 'profile'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'wifi', 'billing', 'orders', 'notifications', 'account'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setSearchParams(tabId === 'profile' ? {} : { tab: tabId })
  }

  // Profile Form Local State
  const [profileForm, setProfileForm] = useState(settings.profile)
  const [wifiForm, setWifiForm] = useState(settings.wifi)
  const [billingForm, setBillingForm] = useState(settings.billing)
  const [orderPrefForm, setOrderPrefForm] = useState(settings.orderPreferences)
  const [notifForm, setNotifForm] = useState(settings.notifications)

  useEffect(() => {
    setProfileForm(settings.profile)
    setWifiForm(settings.wifi)
    setBillingForm(settings.billing)
    setOrderPrefForm(settings.orderPreferences)
    setNotifForm(settings.notifications)
  }, [settings])

  // Account State
  const [adminEmail, setAdminEmail] = useState(dashboardApi.getSessionEmail())
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await dashboardApi.updateRestaurantSettings({
        name: profileForm.name,
        description: profileForm.description,
        address: profileForm.address,
        phone: profileForm.phone,
        email: profileForm.email,
        ...(profileForm.logo ? { logoUrl: profileForm.logo } : {}),
      })
      updateProfile({
        name: profileForm.name,
        description: profileForm.description,
        address: profileForm.address,
        phone: profileForm.phone,
        email: profileForm.email,
        ...(profileForm.logo ? { logo: profileForm.logo } : {}),
      })
      toast.success('Restaurant profile saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Restaurant profile could not be saved.')
    }
  }

  const handleSaveWifi = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await dashboardApi.updateRestaurantSettings({
        wifiSsid: wifiForm.networkName,
        wifiPassword: wifiForm.password,
      })
      updateWifi({ networkName: wifiForm.networkName, password: wifiForm.password })
      toast.success('Guest Wi-Fi name and password saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Wi-Fi settings could not be saved.')
    }
  }

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await dashboardApi.updateRestaurantSettings({
        taxPercentage: billingForm.taxPercentage,
        serviceChargePercentage: billingForm.serviceChargePercentage,
      })
      updateBilling({
        taxPercentage: billingForm.taxPercentage,
        serviceChargePercentage: billingForm.serviceChargePercentage,
      })
      toast.success('Tax and service charge settings saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Billing settings could not be saved.')
    }
  }

  const handleSaveOrderPrefs = (e: React.FormEvent) => {
    e.preventDefault()
    updateOrderPreferences(orderPrefForm)
    toast.error('Order flow preferences are not yet supported by the backend.')
  }

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault()
    updateNotifications(notifForm)
    toast.error('Notification preferences are not yet supported by the backend.')
  }

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault()
    toast.error('Password changes are managed through the configured authentication provider.')
    setCurrentPassword('')
    setNewPassword('')
  }

  // Wi-Fi QR Code string: WIFI:S:MySSID;T:WPA;P:MyPassword;;
  const wifiQrString = `WIFI:S:${wifiForm.networkName};T:WPA;P:${wifiForm.password};;`

  const settingsTabs = [
    { id: 'profile', label: 'Restaurant Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'wifi', label: 'Guest Wi-Fi', icon: <Wifi className="w-4 h-4" /> },
    { id: 'billing', label: 'Taxes & Billing', icon: <Receipt className="w-4 h-4" /> },
    { id: 'orders', label: 'Order Rules', icon: <Sliders className="w-4 h-4" /> },
    { id: 'notifications', label: 'Alert Preferences', icon: <Bell className="w-4 h-4" /> },
    { id: 'account', label: 'Account Security', icon: <Shield className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-charcoal">
          Restaurant Settings
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
          Configure branding, guest connectivity, tax rates, ordering buffers, and notifications.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={settingsTabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        variant="underline"
      />

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Restaurant Identity & Branding</CardTitle>
                <CardDescription>
                  This information is displayed on guest QR dining menus and receipts.
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Restaurant Name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
                <Input
                  label="Tagline"
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Contact Phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  required
                />
                <Input
                  label="Contact Email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
                <Input
                  label="Customer Web Menu URL"
                  value={profileForm.website}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                />
              </div>

              <Input
                label="Physical Address & Suite"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                required
              />

              <Textarea
                label="Restaurant Description"
                rows={3}
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
              />

              {/* Cover & Logo preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-soft mb-1.5">
                    Restaurant Logo URL
                  </label>
                  <div className="flex items-center gap-3">
                    <img
                      src={profileForm.logo}
                      alt="Logo"
                      className="w-12 h-12 rounded-xl object-cover border border-beige shrink-0"
                    />
                    <Input
                      value={profileForm.logo}
                      onChange={(e) => setProfileForm({ ...profileForm, logo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-soft mb-1.5">
                    Cover Banner Image URL
                  </label>
                  <div className="flex items-center gap-3">
                    <img
                      src={profileForm.coverImage}
                      alt="Cover"
                      className="w-16 h-12 rounded-xl object-cover border border-beige shrink-0"
                    />
                    <Input
                      value={profileForm.coverImage}
                      onChange={(e) => setProfileForm({ ...profileForm, coverImage: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Opening Hours Schedule */}
              <div className="pt-4 border-t border-beige">
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand" /> Operating Schedule
                </h4>
                <div className="space-y-2">
                  {profileForm.openingHours.map((schedule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-canvas/60 border border-beige flex items-center justify-between"
                    >
                      <span className="font-semibold text-charcoal">{schedule.days}</span>
                      <span className="text-charcoal-muted font-medium">
                        {schedule.open} – {schedule.close}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 2: Wi-Fi Settings */}
      {activeTab === 'wifi' && (
        <form onSubmit={handleSaveWifi} className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Guest Wi-Fi Network & QR Connection</CardTitle>
                <CardDescription>
                  Guests can connect seamlessly to high-speed dining Wi-Fi without asking staff.
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                Save Wi-Fi Settings
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div className="p-4 bg-canvas/60 rounded-xl border border-beige space-y-4">
                    <Switch
                      label="Enable Guest Wi-Fi"
                      description="Broadcast credentials to dining guests via mobile order portal"
                      checked={wifiForm.enabled}
                      onChange={(v) => setWifiForm({ ...wifiForm, enabled: v })}
                    />

                    <Switch
                      label="Show Wi-Fi Banner on QR Menu"
                      description="Displays a one-tap 'Connect to Guest Wi-Fi' button on the mobile website"
                      checked={wifiForm.showOnCustomerMenu}
                      onChange={(v) => setWifiForm({ ...wifiForm, showOnCustomerMenu: v })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Network SSID (Name)"
                      placeholder="e.g. GrandBistro_Guest_5G"
                      value={wifiForm.networkName}
                      onChange={(e) => setWifiForm({ ...wifiForm, networkName: e.target.value })}
                      required
                    />
                    <Input
                      label="Wi-Fi Password"
                      type="text"
                      placeholder="e.g. BonAppetit2026"
                      value={wifiForm.password}
                      onChange={(e) => setWifiForm({ ...wifiForm, password: e.target.value })}
                      required
                    />
                  </div>

                  <Textarea
                    label="Diner Welcome Instructions"
                    rows={2}
                    value={wifiForm.instructions || ''}
                    onChange={(e) => setWifiForm({ ...wifiForm, instructions: e.target.value })}
                  />
                </div>

                {/* Instant Wi-Fi QR Card */}
                <div className="bg-canvas/50 p-6 rounded-2xl border border-beige flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
                    Direct Connect QR
                  </span>
                  <div className="bg-white p-4 rounded-2xl shadow-card border border-beige my-4">
                    <QRCodeSVG
                      value={wifiQrString}
                      size={150}
                      level="M"
                      includeMargin={false}
                      fgColor="#201F1C"
                    />
                  </div>
                  <p className="text-[11px] text-charcoal-muted max-w-xs">
                    Guests can point their camera at this code to automatically join{' '}
                    <strong className="text-charcoal">{wifiForm.networkName}</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 3: Taxes & Billing */}
      {activeTab === 'billing' && (
        <form onSubmit={handleSaveBilling} className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tax Configuration & Currency</CardTitle>
                <CardDescription>
                  Configure local tax rates, service charges, currency symbols, and invoice numbering.
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                Save Billing Config
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Sales Tax / GST / VAT (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={String(billingForm.taxPercentage)}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, taxPercentage: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
                <Input
                  label="Restaurant Service Charge (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={String(billingForm.serviceChargePercentage)}
                  onChange={(e) =>
                    setBillingForm({
                      ...billingForm,
                      serviceChargePercentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
                <Input
                  label="Invoice Number Prefix"
                  placeholder="e.g. GB-"
                  value={billingForm.invoicePrefix}
                  onChange={(e) => setBillingForm({ ...billingForm, invoicePrefix: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Currency Symbol"
                  placeholder="e.g. $, ₹, €, £"
                  value={billingForm.currencySymbol}
                  onChange={(e) => setBillingForm({ ...billingForm, currencySymbol: e.target.value })}
                  required
                />
                <Input
                  label="Currency Code (ISO)"
                  placeholder="e.g. USD, INR, EUR, GBP"
                  value={billingForm.currencyCode}
                  onChange={(e) => setBillingForm({ ...billingForm, currencyCode: e.target.value })}
                  required
                />
                <Input
                  label="Commercial Tax Registration / EIN"
                  placeholder="US-EIN-94-2849102"
                  value={billingForm.taxId}
                  onChange={(e) => setBillingForm({ ...billingForm, taxId: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 4: Order Rules */}
      {activeTab === 'orders' && (
        <form onSubmit={handleSaveOrderPrefs} className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Order Acceptance & Kitchen Buffers</CardTitle>
                <CardDescription>
                  Tune kitchen throttling, auto-acceptance rules, and table transfers.
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                Save Rules
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 text-xs">
              <div className="p-4 bg-canvas/60 rounded-xl border border-beige space-y-4">
                <Switch
                  label="Auto-Accept Orders into Kitchen Queue"
                  description="Bypasses manual manager confirmation when table orders are submitted"
                  checked={orderPrefForm.autoAcceptOrders}
                  onChange={(v) => setOrderPrefForm({ ...orderPrefForm, autoAcceptOrders: v })}
                />

                <Switch
                  label="Allow Customer Table Transfers"
                  description="Enables guests to move seats while keeping current tab open"
                  checked={orderPrefForm.allowCustomerTableTransfer}
                  onChange={(v) =>
                    setOrderPrefForm({ ...orderPrefForm, allowCustomerTableTransfer: v })
                  }
                />

                <Switch
                  label="Allow Dietary & Allergen Special Notes"
                  description="Enables custom chef note text area on customer menu item modals"
                  checked={orderPrefForm.allowSpecialNotes}
                  onChange={(v) => setOrderPrefForm({ ...orderPrefForm, allowSpecialNotes: v })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Default Kitchen Buffer Time (Minutes)"
                  type="number"
                  min="5"
                  value={String(orderPrefForm.kitchenBufferTimeMinutes)}
                  onChange={(e) =>
                    setOrderPrefForm({
                      ...orderPrefForm,
                      kitchenBufferTimeMinutes: parseInt(e.target.value) || 15,
                    })
                  }
                  required
                />
                <Input
                  label="Minimum Order Amount ($)"
                  type="number"
                  min="0"
                  value={String(orderPrefForm.minOrderAmount)}
                  onChange={(e) =>
                    setOrderPrefForm({
                      ...orderPrefForm,
                      minOrderAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 5: Alert Preferences */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Notification Channels & Audio Alerts</CardTitle>
                <CardDescription>
                  Configure instant sound chimes and email/SMS alerts for incoming table orders.
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                Save Preferences
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="divide-y divide-beige/70">
                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-charcoal">Browser Sound Chimes</p>
                    <p className="text-[11px] text-charcoal-muted">
                      Plays audio bell when a new table QR order arrives
                    </p>
                  </div>
                  <Switch
                    checked={notifForm.soundEnabled}
                    onChange={(v) => setNotifForm({ ...notifForm, soundEnabled: v })}
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-charcoal">Low Stock Threshold Warnings</p>
                    <p className="text-[11px] text-charcoal-muted">
                      Triggers top navbar badge when kitchen pantry ingredients fall below minimum
                    </p>
                  </div>
                  <Switch
                    checked={notifForm.lowStockThresholdAlerts}
                    onChange={(v) => setNotifForm({ ...notifForm, lowStockThresholdAlerts: v })}
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-charcoal">Bill Request Notifications</p>
                    <p className="text-[11px] text-charcoal-muted">
                      Alerts floor captains immediately when a table presses "Request Bill"
                    </p>
                  </div>
                  <Switch
                    checked={notifForm.billRequestAlerts}
                    onChange={(v) => setNotifForm({ ...notifForm, billRequestAlerts: v })}
                  />
                </div>

                <div className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-charcoal">Daily Financial Email Digest</p>
                    <p className="text-[11px] text-charcoal-muted">
                      Sends midnight executive summary of gross revenue, covers, and voids
                    </p>
                  </div>
                  <Switch
                    checked={notifForm.emailAlerts}
                    onChange={(v) => setNotifForm({ ...notifForm, emailAlerts: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 6: Account Security */}
      {activeTab === 'account' && (
        <form onSubmit={handleSaveAccount} className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Manager Credentials & Security</CardTitle>
                <CardDescription>
                  Update your dashboard login email, reset password, and session tokens.
                </CardDescription>
              </div>
              <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                Update Security
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <Input
                label="Admin Account Email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Input
                  label="New Secure Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold">Two-Factor Authentication (2FA) is Active</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Protected with hardware token / authenticator app for manager login.
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
