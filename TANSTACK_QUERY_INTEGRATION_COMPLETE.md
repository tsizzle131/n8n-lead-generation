# TanStack Query Integration - Complete

## Summary

Successfully refactored `GoogleMapsCampaigns.tsx` to use TanStack Query hooks instead of manual polling, eliminating UI flicker, improving error handling, and adding intelligent adaptive polling.

## Changes Made

### 1. Component Refactoring (`frontend/src/components/campaigns/GoogleMapsCampaigns.tsx`)

**Removed:**
- Manual state management (`useState` for campaigns, loading, error)
- Manual `useEffect` polling with `setInterval`
- `fetchCampaigns()` function
- Hardcoded 5-second polling interval

**Added:**
- TanStack Query integration via `useCampaigns` hook
- Smart loading states (only show on initial load, not background refreshes)
- Background refresh indicator (top-right corner)
- Enhanced error UI with retry button
- Progress indicators for running campaigns
- Optimistic updates when executing campaigns
- Query invalidation after mutations (create/execute)

### 2. Type Definitions Updated (`frontend/src/hooks/useCampaigns.ts`)

**Enhanced Campaign Interface:**
```typescript
export interface Campaign {
  id: string;
  name: string;
  location: string;
  keywords: string[];
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused';
  coverage_profile: string;
  target_zip_count: number;
  estimated_cost: number;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  total_businesses_found?: number;
  total_emails_found?: number;
  total_facebook_pages_found?: number;
  total_linkedin_profiles_found?: number;
  linkedin_verified_emails?: number;
  linkedin_deliverable_emails?: number;
  linkedin_risky_emails?: number;
  linkedin_undeliverable_emails?: number;
  actual_cost?: number;
  created_at: string;
  progress?: number;
}
```

Exported interface from hooks for shared usage across components.

### 3. CSS Enhancements (`frontend/src/styles/GoogleMapsCampaigns.css`)

**Added Styles:**
- `.refresh-indicator` - Fixed position indicator in top-right
- `.spinner-small` - Small spinner for background refresh
- `.error-container` - Enhanced error UI with centered layout
- `.progress-info` - Container for running campaign progress
- `.progress-stats` - Stats display for businesses/emails found
- `.auto-refresh-note` - Small note about auto-refresh interval
- Enhanced `.running-indicator` with flex layout for better info display

### 4. Hooks Export (`frontend/src/hooks/index.ts`)

```typescript
export { useCampaigns, type Campaign } from './useCampaigns';
```

Centralized export of Campaign type for component usage.

## Key Features Implemented

### 1. Intelligent Polling
- **Adaptive**: Only polls every 30 seconds when campaigns are running
- **Stops**: Automatically stops polling when no campaigns are running
- **No Background**: Respects browser tab visibility (doesn't poll in background tabs)

### 2. Smart Loading States
```typescript
// Only show on initial mount
if (isLoading && campaigns.length === 0) {
  return <div>Loading campaigns...</div>;
}

// Subtle indicator during background refresh
{isFetching && campaigns.length > 0 && (
  <div className="refresh-indicator">
    <span className="spinner-small"></span> Refreshing...
  </div>
)}
```

### 3. Enhanced Error Handling
```typescript
if (isError) {
  return (
    <div className="error-container">
      <h3>Failed to load campaigns</h3>
      <p>{error?.message || 'An error occurred'}</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
}
```

### 4. Optimistic Updates
```typescript
// Immediately update UI when executing campaign
queryClient.setQueryData(['campaigns'], (old: Campaign[] | undefined) =>
  old?.map(c => c.id === campaignId
    ? { ...c, status: 'running', started_at: new Date().toISOString() }
    : c
  )
);
```

### 5. Progress Indicators
```typescript
{campaign.status === 'running' && (
  <div className="running-indicator">
    <span className="spinner"></span>
    <div className="progress-info">
      <div>Campaign is running...</div>
      {campaign.total_businesses_found > 0 && (
        <div className="progress-stats">
          {campaign.total_businesses_found} businesses found
          {campaign.total_emails_found > 0 &&
            ` • ${campaign.total_emails_found} emails`
          }
        </div>
      )}
      <div className="auto-refresh-note">
        Auto-refreshing every 30s
      </div>
    </div>
  </div>
)}
```

### 6. Query Invalidation After Mutations
```typescript
// After creating a campaign
await queryClient.invalidateQueries({ queryKey: ['campaigns'] });

// After error during execution (revert optimistic update)
queryClient.invalidateQueries({ queryKey: ['campaigns'] });
```

## Benefits

### Performance
- **Reduced API Calls**: No more polling every 5 seconds regardless of state
- **Smart Caching**: TanStack Query caches data, reducing redundant fetches
- **Background Refresh**: Only refreshes when running campaigns exist

### User Experience
- **No UI Flicker**: Loading state only shows on initial load
- **Instant Feedback**: Optimistic updates make UI feel snappy
- **Progress Visibility**: Users see real-time progress for running campaigns
- **Better Errors**: Clear error messages with easy retry

### Code Quality
- **Less Boilerplate**: Removed ~40 lines of manual polling code
- **Better Separation**: Data fetching logic in hooks, UI logic in components
- **Type Safety**: Shared Campaign interface ensures type consistency
- **Maintainability**: Single source of truth for campaign data

## Verification

### Build Status
```
✓ TypeScript compilation successful
✓ No type errors in GoogleMapsCampaigns.tsx
✓ Build completed with warnings only (no errors)
```

### Files Modified
1. `/frontend/src/components/campaigns/GoogleMapsCampaigns.tsx`
2. `/frontend/src/hooks/useCampaigns.ts`
3. `/frontend/src/hooks/index.ts`
4. `/frontend/src/styles/GoogleMapsCampaigns.css`

## Next Steps

**Testing Required:**
- Manual testing with Playwright to verify:
  - Campaign list loads correctly
  - Creating campaigns triggers refresh
  - Executing campaigns shows optimistic update
  - Running campaigns show progress
  - Background refresh indicator appears
  - Error UI displays and retry works
  - Polling stops when no campaigns running

**Future Enhancements:**
- Add mutation hooks for create/execute operations
- Implement skeleton loaders for initial load
- Add toast notifications for successful operations
- Consider using React Query DevTools in development

## Technical Notes

### Polling Configuration
```typescript
refetchInterval: (query) => {
  const campaigns = query.state.data || [];
  const hasRunningCampaigns = campaigns.some((c: Campaign) => c.status === 'running');
  return hasRunningCampaigns ? 30000 : false; // 30s if running, else stop
},
refetchIntervalInBackground: false,
```

### Query Key
```typescript
queryKey: ['campaigns']
```

All operations (queries, mutations, invalidations) use this consistent key.

### Error Retry
TanStack Query automatically handles retries with exponential backoff:
- Default: 3 retries
- Exponential backoff: 1s, 2s, 4s
- Customizable via `retry` and `retryDelay` options

## Conclusion

The GoogleMapsCampaigns component now uses modern React Query patterns for data fetching, with intelligent polling, optimistic updates, and excellent UX. The code is cleaner, more maintainable, and provides a better user experience with no UI flicker during background refreshes.
