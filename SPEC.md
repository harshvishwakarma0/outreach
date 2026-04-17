# WhatsApp Outreach Tool - Safe Semi-Automated Cold Outreach

## Concept & Vision

A professional, efficient outreach assistant that helps healthcare B2B sales teams connect with clinic owners and doctors via WhatsApp. The tool generates pre-filled Click-to-Chat links that open WhatsApp Web with personalized messages, keeping humans in the sending loop to avoid spam detection. The interface feels like a command center—organized, trustworthy, and purpose-built for medical sales professionals.

## Design Language

**Aesthetic Direction:** Clean medical-professional aesthetic with subtle warmth. Inspired by modern healthcare SaaS platforms—think Doctolib meets Stripe's clarity.

**Color Palette:**
- Primary: `#25D366` (WhatsApp green for trust/recognition)
- Secondary: `#128C7E` (Darker teal for depth)
- Accent: `#0066FF` (Action blue for CTAs)
- Background: `#F8FAFC` (Soft clinical white)
- Surface: `#FFFFFF` (Cards/panels)
- Text Primary: `#1E293B` (Slate-900)
- Text Secondary: `#64748B` (Slate-500)
- Border: `#E2E8F0` (Slate-200)
- Error: `#EF4444`
- Success: `#22C55E`

**Typography:**
- Primary: Inter (Google Fonts) - clean, professional, excellent readability
- Monospace: JetBrains Mono for phone numbers/links
- Scale: 14px base, 1.5 line height

**Spatial System:**
- Base unit: 4px
- Card padding: 24px
- Section gaps: 32px
- Component gaps: 16px

**Motion Philosophy:**
- Subtle fade-ins for list items (opacity 0→1, 200ms ease-out)
- Gentle scale on button hover (scale 1.02, 150ms)
- Toast notifications slide in from top-right (300ms ease-out)
- Checkmark animations for sent confirmations

**Visual Assets:**
- Heroicons (outline style) for UI icons
- WhatsApp logo for brand recognition
- Empty state illustrations via CSS gradients

## Layout & Structure

**Single Page Application with Three Main Sections:**

1. **Header Bar** (sticky, 64px)
   - App title with WhatsApp icon
   - Quick stats: total contacts, ready to send count

2. **Main Workspace** (two-column on desktop, stacked on mobile)
   - **Left Panel (40%):** Message Composer
     - Template selector (dropdown)
     - Dynamic message preview with variable highlighting
     - Character count indicator
   - **Right Panel (60%):** Contact List
     - Import options (manual add, paste list)
     - Contact cards with name, phone, status
     - Bulk action toolbar
     - Individual "Open WhatsApp" buttons

3. **Footer** (minimal)
   - Safety tip callout
   - Version/credit

**Responsive Strategy:**
- Desktop (>1024px): Side-by-side panels
- Tablet (768-1024px): Stacked panels with collapsible composer
- Mobile (<768px): Tab-based navigation between composer and list

## Features & Interactions

### Core Features

**1. Message Template System**
- Pre-built templates for common outreach scenarios
- Custom template creation with variable support
- Variables: `{firstName}`, `{clinicName}`, `{yourName}`, `{product}`
- Live preview updates as variables are filled
- Character limit indicator (WhatsApp limit: 4096)

**2. Contact Management**
- Add individual contacts (name + phone)
- Bulk import via paste (supports CSV format: name,phone)
- Edit/delete contacts
- Search/filter contacts
- Tag contacts for segmentation (optional)

**3. Link Generation**
- Generate wa.me links with pre-filled message
- One-click copy link to clipboard
- Individual "Open in WhatsApp" buttons
- Bulk "Open All" with sequential timing (for power users)

**4. Activity Tracking (Local Storage)**
- Mark contacts as "Contacted"
- Add notes to contacts
- Filter by status (Pending, Contacted, No Answer, Interested)

### Interaction Details

**Adding a Contact:**
- Click "+ Add Contact" → Modal slides in from right
- Enter name (required), phone (required, validates Indian format), clinic name (optional)
- Save → Contact card animates into list
- Error → Field highlights red, shake animation

**Generating Links:**
- With contacts selected and message composed, click "Generate Links"
- Links appear inline on each contact card
- Click "Open WhatsApp" → Opens wa.me/[number]?text=[encoded message] in new tab
- Toast notification confirms action

**Bulk Operations:**
- Select multiple contacts via checkboxes
- "Select All" / "Deselect All"
- Bulk generate links
- Bulk mark as contacted

### Edge Cases & Error Handling
- Invalid phone number → Red border, tooltip "Enter valid 10-digit Indian mobile"
- Empty contact list → Friendly empty state with import CTA
- No message composed → Disable generate button, tooltip "Write a message first"
- URL encoding failures → Graceful fallback with error toast
- LocalStorage full → Warning banner, suggest clearing old data

### States
- **Empty State:** Illustration + "Add your first contact to start outreach"
- **Loading State:** Skeleton cards while processing bulk imports
- **Success State:** Green checkmark animation on contact cards after opening WhatsApp

## Component Inventory

### Header
- App logo/title
- Stats badges (total, ready)
- States: default only

### MessageComposer
- Template dropdown selector
- Textarea with variable highlighting
- Variable insert buttons
- Character counter
- States: empty, composing, valid, over-limit

### ContactCard
- Avatar (initials), name, phone (monospace), clinic
- Checkbox for selection
- Status badge
- Action buttons: Open WhatsApp, Edit, Delete
- Generated link display
- States: default, selected, contacted, hover, loading

### ContactList
- Search input
- Filter dropdown (status)
- Bulk action bar (appears when items selected)
- Scrollable container
- Empty state
- States: empty, populated, filtered, loading

### AddContactModal
- Form fields with validation
- Save/Cancel buttons
- States: closed, open, saving, error

### ImportModal
- Textarea for paste import
- Format helper text
- Preview of parsed contacts
- States: closed, open, parsing, preview, error

### Toast Notifications
- Success (green), Error (red), Info (blue)
- Auto-dismiss after 3 seconds
- Manual dismiss button

### Button
- Variants: primary (green), secondary (outline), danger (red)
- Sizes: sm, md, lg
- States: default, hover, active, disabled, loading

### Input
- Label, input field, helper text, error message
- States: default, focused, error, disabled

## Technical Approach

**Framework:** React 18 + TypeScript + Vite + Tailwind CSS

**State Management:** React useState + useReducer for complex contact list state

**Data Persistence:** localStorage for contacts and templates

**Key Implementation Details:**

1. **WhatsApp Link Generation:**
   ```
   Base: https://wa.me/{phone_without_plus}
   With message: https://wa.me/{phone}?text={encodeURIComponent(message)}
   Phone format: 91XXXXXXXXXX (Indian mobile, 10 digits)
   ```

2. **Message Variables:**
   - Regex replacement: `\{(\w+)\}` → replaced with contact-specific or user-defined values
   - Highlighted in preview with pill badges

3. **Contact Storage Schema:**
   ```typescript
   interface Contact {
     id: string;
     name: string;
     phone: string;
     clinicName?: string;
     status: 'pending' | 'contacted' | 'no-answer' | 'interested';
     notes?: string;
     createdAt: number;
   }
   ```

4. **Template Storage Schema:**
   ```typescript
   interface Template {
     id: string;
     name: string;
     content: string;
     isDefault: boolean;
   }
   ```

**No External Dependencies Beyond:**
- React + ReactDOM
- Tailwind CSS
- Heroicons (via inline SVG)
