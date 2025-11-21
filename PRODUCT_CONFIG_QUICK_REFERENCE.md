# Product Configuration Component - Quick Reference

## Component Locations

| Component | File | Lines |
|-----------|------|-------|
| Warning Banner | `frontend/src/components/campaigns/GoogleMapsCampaigns.tsx` | 311-378 |
| Completion Calculation | `frontend/src/components/campaigns/GoogleMapsCampaigns.tsx` | 78-98 |
| Button | `frontend/src/components/campaigns/GoogleMapsCampaigns.tsx` | 346-359 |
| Product Config Form | `frontend/src/components/settings/ProductConfiguration.tsx` | 1-462 |
| Modal Integration | `frontend/src/components/organizations/Organizations.tsx` | 539-571 |
| Navigation | `frontend/src/App.tsx` | 10-100 |

---

## Key Text Strings

Search for these strings to find related code:

```
"Product Configuration Incomplete"
"Complete Product Setup"
"generic without product details"
"Your AI-generated emails will be generic"
"product_name"
"product_description"
"value_proposition"
"target_audience"
```

---

## Required Product Fields

All 4 must be filled for 100% completion:

1. **product_name** - What's your product called?
2. **product_description** - Describe your product in detail
3. **value_proposition** - What results do customers get?
4. **target_audience** - Who is this product for?

---

## Optional/Additional Fields

- `industry` - Category (Beauty, Tech, Healthcare, etc.)
- `messaging_tone` - Professional, Casual, Technical, Creative, Friendly
- `product_features` - Array of key features (list)
- `product_examples` - Array of example icebreakers (list)
- `product_url` - Website URL for auto-analysis
- `product_analyzed_at` - Timestamp when URL was analyzed

---

## Completion Percentage Calculation

```javascript
const calculateConfigCompletion = (): number => {
  if (!productConfig) return 0;
  
  const requiredFields = [
    'product_name',
    'product_description', 
    'value_proposition',
    'target_audience'
  ];
  
  const filledFields = requiredFields.filter(field =>
    productConfig[field] && String(productConfig[field]).trim().length > 0
  );
  
  return Math.round((filledFields.length / requiredFields.length) * 100);
};
```

---

## API Endpoints

### Get Current Organization
```
GET http://localhost:5001/current-organization
Response: { organizationId: string }
```

### Get Product Config
```
GET http://localhost:5001/organizations/{organizationId}/product-config
Response: ProductConfig
```

### Save Product Config
```
PUT http://localhost:5001/organizations/{organizationId}/product-config
Body: ProductConfig
```

### Analyze Product URL (FastAPI)
```
POST http://localhost:8000/analyze-product-url
Body: { url: string }
Response: { success: boolean, data: ProductConfig, error?: string }
```

---

## Warning Banner Styling

```jsx
className="alert alert-warning"
backgroundColor: '#fffbeb'
borderLeft: '4px solid #f59e0b'
color: '#78350f'
titleColor: '#92400e'
```

---

## Progress Bar Colors

- Red: < 50% complete
- Orange: 50-99% complete
- Green: 100% complete

---

## Navigation Flow

```
User clicks "📝 Complete Product Setup" button
         ↓
href="/organizations" (NOTE: This may have a bug - check tab-based routing)
         ↓
Organizations tab activates
         ↓
Can click "Product" button on org card to open modal
         ↓
ProductConfiguration component renders
         ↓
User fills 4 required fields
         ↓
Click "Save Configuration"
         ↓
PUT /organizations/{id}/product-config
         ↓
Modal closes, data saved
         ↓
Warning banner disappears from GoogleMapsCampaigns
```

---

## TypeScript Interfaces

### In GoogleMapsCampaigns.tsx:
```tsx
interface ProductConfig {
  product_name?: string;
  product_description?: string;
  value_proposition?: string;
  target_audience?: string;
  industry?: string;
  messaging_tone?: string;
}
```

### In ProductConfiguration.tsx:
```tsx
interface ProductConfig {
  product_url?: string;
  product_name?: string;
  product_description?: string;
  value_proposition?: string;
  target_audience?: string;
  industry?: string;
  product_features?: string[];
  product_examples?: string[];
  messaging_tone?: string;
  product_analyzed_at?: string;
}

interface ProductConfigurationProps {
  organizationId: string;
  isNewOrganization?: boolean;
  onSave?: () => void;
  onClose?: () => void;
}
```

---

## Component Props (ProductConfiguration)

```tsx
<ProductConfiguration
  organizationId={string}           // Required: Organization ID
  isNewOrganization={boolean}       // Optional: Show "Welcome" messaging
  onSave={() => void}               // Optional: Callback when saved
  onClose={() => void}              // Optional: Callback when closed
/>
```

---

## Modal Structure (Organizations)

```jsx
<div className="modal-overlay">
  <div className="modal large">
    <div className="modal-header">
      <h3>Product Configuration</h3>
      <button className="close-btn">×</button>
    </div>
    <div className="modal-body">
      <ProductConfiguration {...props} />
    </div>
  </div>
</div>
```

---

## Warning Display Condition

```jsx
{!loadingProductConfig && !isProductConfigComplete && (
  /* Show warning banner */
)}
```

Both conditions must be true:
1. `loadingProductConfig` must be false (data loaded)
2. `isProductConfigComplete` must be false (not 100% complete)

---

## Progress Indicator (Inside Warning)

```jsx
<div style={{
  height: '8px',
  backgroundColor: '#fef3c7',
  borderRadius: '4px',
  overflow: 'hidden'
}}>
  <div style={{
    height: '100%',
    width: `${configCompletion}%`,
    backgroundColor: configCompletion < 50 ? '#ef4444' : 
                     configCompletion < 100 ? '#f59e0b' : '#10b981',
    transition: 'width 0.3s ease'
  }}></div>
</div>
```

---

## Missing Fields Display

Shows which fields are not yet filled:

```jsx
Missing: {['product_name', 'product_description', 'value_proposition', 'target_audience']
  .filter(field => !productConfig?.[field] || !String(productConfig[field]).trim())
  .map(field => field.replace('_', ' '))
  .join(', ')}
```

Example output: "Missing: product name, value proposition"

---

## File Paths (Absolute)

```
/Users/tristanwaite/n8n test/frontend/src/components/campaigns/GoogleMapsCampaigns.tsx
/Users/tristanwaite/n8n test/frontend/src/components/settings/ProductConfiguration.tsx
/Users/tristanwaite/n8n test/frontend/src/components/organizations/Organizations.tsx
/Users/tristanwaite/n8n test/frontend/src/styles/ProductConfiguration.css
/Users/tristanwaite/n8n test/frontend/src/App.tsx
```

---

## Key Line Numbers

| What | File | Lines |
|------|------|-------|
| Warning banner | GoogleMapsCampaigns.tsx | 312-378 |
| Completion calc | GoogleMapsCampaigns.tsx | 79-95 |
| Data loading | GoogleMapsCampaigns.tsx | 50-76 |
| Product config load | ProductConfiguration.tsx | 42-58 |
| URL analysis | ProductConfiguration.tsx | 60-93 |
| Save config | ProductConfiguration.tsx | 95-122 |
| Modal trigger | Organizations.tsx | 314-323 |
| Modal render | Organizations.tsx | 539-571 |

---

## Warning Banner Visible When

- Page loads and product config is not 100% complete
- Disappears immediately when all 4 fields are filled and saved
- Shows progress bar with color indication
- Lists missing fields
- Has orange "Complete Product Setup" button

---

## Form Validation

Form requires all 4 fields to be filled (non-empty, trimmed):
- product_name: string with length > 0 (trimmed)
- product_description: string with length > 0 (trimmed)
- value_proposition: string with length > 0 (trimmed)
- target_audience: string with length > 0 (trimmed)

Optional fields (don't block 100%):
- industry
- messaging_tone
- product_features
- product_examples
- product_url
- product_analyzed_at

---

## Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| Warning background | Light yellow | #fffbeb |
| Warning border | Orange | #f59e0b |
| Warning title | Dark orange | #92400e |
| Warning text | Dark brown | #78350f |
| Button background | Orange | #f59e0b |
| Button text | White | ffffff |
| Progress bar (red) | Red | #ef4444 |
| Progress bar (orange) | Orange | #f59e0b |
| Progress bar (green) | Green | #10b981 |

