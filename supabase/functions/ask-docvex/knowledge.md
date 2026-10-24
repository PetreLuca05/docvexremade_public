Knowledge base for the DocVex website assistant. Generated from the app and the website; regenerate when either changes.

# DocVex knowledge base

## What DocVex is

DocVex is a desktop app for lawyers and legal professionals in Romania ("Every case file. One place."). The documents of a case arrive from e-mail, WhatsApp, scans and court portals; DocVex gathers them in a **project**, which is simply an ordinary folder on the user's computer, and adds legal tools on top:

- **Projects**: open any file in the project right in the app, without starting other programs.
- **Previews** for Word, PDF, Excel, PowerPoint, images, audio, video and exported WhatsApp chats.
- **Legislation and CAEN recognition**: references to Romanian legislation and CAEN codes are highlighted in the open document.
- **Legal research with AI**: questions get answers that cite the public sources they come from (legislatie.just.ro, EUR-Lex, portal.just.ro, ANAF, UNBR).
- **Scanning**: photos of documents are straightened and cleaned up.
- **Updates** delivered through the app.

DocVex is a working tool, not a legal adviser. AI answers and recognised references may be incomplete or wrong; always check the official text.

## Platforms and installation

- DocVex runs on **Windows** and **macOS**. Every plan includes the desktop app and its updates.
- Installers are on the website's **Download** page, which shows the latest version for your system, all earlier versions with release notes, and (for macOS) builds for Apple silicon (M1 and later), Intel or Universal where available. The file downloads directly from GitHub, where the app's versions are published.

**Windows**
1. Download `docvex-…-setup.exe`.
2. Open it and follow the installer (a desktop shortcut is created).
3. If Windows shows "Windows protected your PC", choose **More info**, then **Run anyway**.
4. Start DocVex from the Start menu.

**macOS**
1. Download `docvex-….dmg`.
2. Open it and drag **Docvex** into **Applications**.
3. If macOS says the app cannot be verified, open **System Settings → Privacy & Security** and choose **Open Anyway**.
4. Start DocVex from Launchpad or Applications.

A DocVex account is needed to use the app.

## Projects and files

### Projects
- A project is a normal folder. DocVex keeps a small data file in it (name, owner, creation date) so the folder is recognised as a project.
- On the **Projects** tab you choose a directory; the projects in it appear as cards, the last opened first.
- **Create**: type a name and a folder with that name is created in the chosen directory; your account is recorded as owner.
- **Import**: open a project folder from any other location. It stays where it is (referenced, not copied).
- A card's right-click menu: **Properties** (owner, files, size, created, location) and **Settings** (rename; the folder keeps its name).
- Switching projects asks first and closes open viewer windows. Signing out leaves projects untouched.

### Layout
Sidebar: Projects, Activity, Newsletter, Playbook, Updates; for the open project: Dashboard, Law research, Files; then Settings. The sidebar can be resized or collapsed to icons. The title bar has a light/dark theme switch and the account menu.

### Dashboard
Per project: file count and size, a project actions menu (Open file location, Settings, Properties), rename, the owner, this month's AI usage, and an **activity** grid with one square per day (click a day to see its actions). Activity counted: sign-ins, AI requests, file creation, file deletion, prints, scans and conversions. The log is stored inside the project folder, so it moves with the project.

### Files tab
An Explorer-style browser limited to the project folder.
- Back, Forward, Up, Refresh and a breadcrumb address bar.
- **Search this folder** filters the current folder by file name (not subfolders or contents).
- **New**: folder, text document, Word, Excel or PowerPoint file (created by DocVex; Office not needed).
- Views from Details and List to icons of any size (Ctrl + mouse wheel); sort by name, date, type or size; optional grouping into Folders, Documents, Media, Archives, Other.
- Drag and drop: files from other apps are copied in (Shift to move); inside the project dragging moves (Ctrl to copy). Items can be dragged out to other apps.
- Cut/Copy/Paste work within DocVex; "Copy as path" copies file paths to the system clipboard.
- **Recycle Bin**: belongs to the project (kept inside its folder, not the system bin), shown first in every folder. Deleted items are removed permanently after **30 days**, with a countdown on each. Restore, delete permanently or empty the bin.
- **Undo / Redo** for create, rename, move, copy, delete and restore (up to 100 steps per session). Permanent deletes cannot be undone and ask first.
- **Extract** unpacks archives (ZIP, 7z, RAR, TAR, GZ/TGZ, BZ2, XZ, ZST, CAB) into a new folder next to them; archives are not opened directly.
- **Properties**: thumbnail, type, size, dates, location.
- **Import files**: pick files from the computer (copied into the current folder) or use your phone (see Scanning).
- Double-click a file to open it in the **File viewer**, a separate window.

**Shortcuts** (on macOS most also work with Cmd): Enter open · F2 rename · F5 refresh · Backspace up · Alt+Left/Right back/forward · Alt+Enter properties · Ctrl+X/C/V cut/copy/paste · Ctrl+Shift+C copy as path · Ctrl+A select all · Ctrl+Z undo · Ctrl+Y or Ctrl+Shift+Z redo · Del to Recycle Bin · Shift+Del delete permanently · Ctrl+F search.

## Supported formats and previews

The File viewer's quick actions: Print, Pages, Scan, Focus (document only, full screen; Esc leaves), Open with (another program), Information (zoom, word count, pages), Convert and **AI pass**. Zoom with Ctrl+plus/minus, Ctrl+0 to reset, or Ctrl + wheel / pinch.

- **PDF**: built-in viewer with selectable text, page thumbnails, page number and word count.
- **Word, PowerPoint, RTF and OpenDocument** (.doc, .docx, .docm, .dotx, .rtf, .odt, .ppt, .pptx, .pptm, .potx, .odp): converted to PDF for an exact layout, using Microsoft Office (Windows, if installed) or LibreOffice (if installed). Without either, .docx files get a basic preview and other Office files show "No preview available" with Open with. Password-protected files are not previewed.
- **Excel** (.xls, .xlsx, .xlsm, .xltx): drawn as a grid with formula bar, sheet tabs and the file's formatting; navigate with arrows, Enter and Tab. Large sheets show the first 1,000 rows and 100 columns. A **Pages** view shows the sheets as printed (needs Office or LibreOffice). .ods is shown via PDF conversion.
- **Outlook, OneNote, Access** files are recognised but open in their own applications.
- **Text and data**: .txt, .md, .csv, .tsv, .json, .xml, .html, .eml, .srt, .vtt and common code/config files, shown as plain text (up to 20 MB).
- **Images**: PNG, JPEG, GIF, WebP, BMP, SVG, ICO, AVIF, APNG. TIFF, HEIC/HEIF, PSD and camera RAW are recognised but not previewed.
- **Video and audio**: MP4, WebM, Ogg, MP3, WAV, FLAC and similar play directly; MKV, AVI, MOV, WMV, FLV, MPEG, HEVC, WMA, AIFF, AC3, AMR and many more are converted on the fly by a converter included with the app, so nothing needs installing. Player keys: Space/K play-pause, Left/Right ±5 s, J/L ±10 s, Up/Down volume, M mute, F full screen, Home/End, 0–9 jump to 0–90%. MIDI is not previewed.
- **WhatsApp exports**: shown as a chat (see below).
- **Convert**: save a copy as PDF (Office documents and workbooks) or as PNG/JPEG (images). Word output is marked "Coming soon".
- **Print**: PDFs, converted Office files, images, text and paused video frames print through the system dialog; other types print via their own app on Windows only.
- **Data panel**: file details, photo information (camera, dates, GPS), document and PDF properties, media details, e-mail headers, archive contents, and MD5/SHA-1/SHA-256 checksums.

## Legislation and CAEN recognition

In the File viewer, references to legislation and CAEN codes are highlighted in the document.

**Automatic (on your computer, instant)**
- Acts with number and year: Lege, OUG, OG, HG, decrees, orders and decisions, including CCR and ICCJ decisions.
- The Civil, Criminal, Fiscal and Labour Codes, the Civil, Criminal and Fiscal Procedure Codes, and the Constitution.
- Article, paragraph, letter and point references (e.g. "art. 5 alin. (2) lit. c) din Legea 31/1990"), with or without diacritics.
- CAEN codes: 4-digit codes after "CAEN" (also "CAEN Rev. 2"), including lists.

**AI pass (on request)**: sends the document's text to the AI to find what the automatic pass misses, such as ministerial and ANAF orders, instructions, authority decisions, ICCJ rulings unifying case law, and CAEN codes written as activity names. Press again to hide its results. Works on documents containing text (scanned PDFs without a text layer yield nothing); very long documents (over about 200,000 characters) are refused.

**Highlights**: legislation in the accent colour, CAEN codes in green; hovering shows the act, article and paragraph, or the code and activity. Clicking a highlight does nothing yet.

## Legal research with AI

The **Law research** tab of each project is an AI chat.

- Ask about Romanian or EU law, a case, a company or a lawyer. The AI searches public sources and answers with citations, in your language (usually Romanian). It is instructed to rely on sources, not memory, and not to invent acts, articles, case numbers or companies.
- **Sources**:
  - **legislatie.just.ro**: Romanian normative acts, by words, title, number or year.
  - **EUR-Lex**: EU regulations and directives, by Romanian title.
  - **portal.just.ro**: court case files by party, object or case number, across all courts.
  - **ANAF**: a company's details by CUI (name, address, Trade Register number, CAEN code, VAT status, inactive status).
  - **UNBR lawyer directory**: lawyers by name (bar, qualified or trainee, years of experience).
  - Case-law databases needing their own login (such as ReJust) are not connected.
- **Citations**: numbered marks link to the source; a "Sources" row lists site, title and excerpt.
- Progress lines show what the AI is doing ("Searching legislation", "Checking ANAF", …); answers stream in and can be stopped.
- **Attachments**: attach one or more project files. Text and Word files are sent as text; PDFs and images as files (up to 25 MB). Only what you attach is sent.
- **Models**: Auto, Opus ("Deep legal analysis, drafting"), Sonnet ("Everyday research"), Haiku ("Quick answers"). Auto picks per message.
- **Conversations** can be created and deleted and are saved per project on your computer only (not synced).
- **Usage**: requests and tokens are counted monthly per account and shown on the Dashboard and on the website's My account page. Exact AI limits per plan are **not decided yet**.

The AI is **Claude, by Anthropic**, via Google Cloud Vertex AI in the EU or directly via Anthropic. Using Legal research or AI pass means interacting with an AI system whose text is generated automatically (EU AI Act, Article 50). Answers may contain errors and are no substitute for legal advice. AI features start only at your request; the rest of the app works without them. DocVex makes no decisions with legal effects and is not meant for courts to decide cases.

Not available yet: browsing or searching legislation yourself outside the chat, a full-text act reader, and attaching acts to a project for offline use.

## WhatsApp imports

DocVex reads WhatsApp's **"Export chat"** files.

- Put the chat's .txt file (with its media in the same folder) in a project and open it; it opens in its own viewer window. Chats are recognised by content, even if renamed. A zipped export must be extracted first (DocVex offers to), then open the .txt.
- Android and iPhone exports, any date order, 12- or 24-hour clocks.
- Displayed like WhatsApp: day separators, bubbles left and right (choose whose side is "yours"), sender names and avatars in groups, text formatting and links.
- Shown inline: photos, videos, stickers, voice notes (1×, 1.5×, 2× speed), documents, contacts, locations, polls, calls (iPhone exports), link previews and notices. Missing or view-once media is marked "not included in the export".
- **Date range** filter and a **reverse order** button.
- **Chat info**: tabs for Media, Stickers, Voice, Docs, Links, Contacts and Calls (click to jump to the message), plus metadata (messages, participants, dates, messages per person, missing attachments).
- Attachments open in their own viewer, in the system app, or in the Files tab.
- The chat is processed on your computer; map previews and website icons for links load from the internet.
- Not available yet: searching within a chat, voice-note transcription, exporting a chat to PDF or Word.

## Scanning

**Scan tool** (File viewer, on a photo in the project or a paused video frame):
- Page corners are detected automatically and can be dragged with a magnifier; extra points can be added for curved pages.
- Filters: Color, Grayscale, Black & White, Photo; rotate; preview the result. Undo/redo with Ctrl+Z/Ctrl+Y; Esc leaves.
- One page at a time. Save as a **new image** next to the original or **replace the original** (JPEG, PNG, WebP). Saving as Word is not available yet.
- The website and the Solo plan describe "document scanning to PDF"; in the current test version the scan is saved as an image. The tool does not use a camera directly.

**From your phone** (Files tab → Import files → "Or scan with your phone"): a QR code opens a page on your phone to upload photos or files into the current folder, or download its files.
- **Local network**: phone on the same Wi-Fi; transfers are unencrypted on that network (the dialog warns).
- **DocVex cloud**: any network, encrypted; a new secret address each time.
- Works only while the dialog is open; same-name files are renamed, not overwritten.

## Settings

Open from the sidebar or the account menu ("View all settings"). Choices are saved to your account.

**Formatting**
- **Preset**: *Romanian* (default: 13.10.2026, 24-hour clock, 1.234.567,89; fields locked) or *Custom* (choose each; **Reset custom** returns to system formats).
- **Date**: System default; 13.10.2026; 13/10/2026; month/day/year; ISO (2026-10-13); medium (abbreviated month); long (13 October 2026).
- **Time**: System default; 24-hour; 24-hour with seconds; 12-hour; 12-hour with seconds.
- **Numbers**: System default; 1,234,567.89; 1.234.567,89; 1 234 567,89; plain.
- **File sizes**: KB = 1024 bytes; KiB = 1024 bytes; kB = 1000 bytes.
- **Recent days** (chat day headings): "Today, Yesterday, weekday" or "Always the date".

**AI**
- **Token usage**: Show or Hide token counts under AI responses and estimates while typing.

**Theme**: light or dark via the title-bar button; remembered for every window.

## Accounts and sign-in

- One **DocVex account** works on the website and in the app.
- **Sign-up (website)**: Account (name and email, or Continue with Google) → Password (at least 8 characters, letters and digits) → Plan → Review (accept the terms). Email accounts are confirmed by a link.
- **Sign-in**: Google (opens your browser) or email and password; a forgotten password can be reset by email link.
- **In the app**: the account menu shows name, sign-in method, email verification, member since, last sign-in and current project. **Log out** signs out that computer only.
- **My account (website)**: edit name, email and password; manage sign-in methods (Google and/or email; you can't remove your only one); change plan; open the Stripe portal for subscription, card and invoices; see this month's AI usage. Signing out of the site doesn't sign out the app.
- **Deleting an account**: request it through the contact address (see Support and contact).

## Plans and pricing

"A plan for every firm." Prices per month; every plan includes the desktop app for Windows and macOS and its updates.

| Plan | Price | For | Features |
|---|---|---|---|
| **Start** | 0 lei | Trying DocVex | Projects and file previews; Legislation and CAEN codes; AI research limit *not decided yet* |
| **Solo** (recommended) | 199 lei | The lawyer or legal professional working with case files daily | Everything in Start; AI-assisted legal research; Document scanning to PDF; other features *not decided yet* |
| **Firm** | 499 lei | Law firms and legal teams | Everything in Solo; number of users and support *not decided yet* |

- Details marked "[TO FILL IN]" on the site are not decided yet; don't guess them.
- Paid plans are paid on Stripe's checkout; card details go only to Stripe. Online payment may not be available yet for every plan.
- The Terms say the current test versions are free, and that before any paid order you'll see price and conditions, including the 14-day right of withdrawal under consumer law.

## Updates

- The app checks for updates shortly after starting and every 6 hours; **Check for updates** in the **Updates** tab checks now.
- The tab shows release notes, the installed version and whether you're up to date.
- When a version is available, press **Download** (with progress), then **Restart to install** (save your work first), or just close the app: the update installs on the next restart.
- Updates come from GitHub; checks send your IP address and app version there.

## Privacy and data

**Stays on your computer**: documents and projects (no upload to a DocVex server), Law research conversations, the activity log, WhatsApp chats and scans.

**Leaves your computer only when a feature needs it**:
| What | Data | Recipient |
|---|---|---|
| Account | Email, name, photo, sign-in data, plan, AI usage counts | Supabase (account provider) |
| AI research and AI pass | Your questions and the text or attachments you choose to send | Anthropic (Claude), via Google Cloud Vertex AI in the EU or directly |
| Public-source searches | Search terms | legislatie.just.ro, EUR-Lex, portal.just.ro, ANAF, UNBR |
| Updates | IP address, app version | GitHub |
| Payments | Card details (entered with Stripe); DocVex gets confirmation, amount, plan, email | Stripe Payments Europe (Ireland) |

- If you send documents with other people's data (e.g. clients'), you decide what is sent and remain controller for it; avoid special-category or criminal data without a legal basis, and respect professional secrecy (Law no. 51/1995).
- Text sent to AI is not stored on a DocVex server; the provider keeps it only as its terms allow. Account data is kept while you have an account.
- Processing follows the GDPR and Law no. 190/2018; processors work under data processing agreements; transfers outside the EEA use the EU-U.S. Data Privacy Framework or standard contractual clauses. No selling of data, no advertising. Connections are encrypted (HTTPS).
- GDPR rights (access, rectification, erasure, restriction, portability, objection) are exercised via the contact address; complaints can go to ANSPDCP (dataprotection.ro). Not intended for under-16s.
- **Website**: static, no analytics, ads or **cookies**; it stores only your language choice and, if signed in, your session. Hosted on GitHub.

## Limitations and status

- **Internal testing**: current versions are for internal testing, not public use; they may contain errors and change without notice. Keep backups of your documents.
- Placeholders or not yet working:
  - **Activity** (app-wide tab) and **Newsletter** are empty; per-project activity is on the Dashboard.
  - **Playbook** (learning your drafting style) is a preview with sample content; it does nothing yet.
  - Clicking highlighted references, "Extract text", saving as Word, viewer search and chat search.
  - Adding project members and deleting a project from the Dashboard.
  - Attaching acts to a project and an offline act library.
- Exact Office layouts and spreadsheet page views need Microsoft Office (Windows) or LibreOffice.
- Verify AI answers against official sources; don't use them for decisions with legal effects without human oversight; follow Anthropic's acceptable use policy.
- Unfilled plan details and exact AI limits are not decided yet.

## Support and contact

- Contact details (operator name, address, tax ID, email, phone) are **not published on the site yet**; the Legal information page still shows them as to be filled in. Don't invent an address.
- Once published, that address handles questions, data requests, account deletion, complaints (reply within 30 days) and accessibility issues. Security vulnerabilities go there with the subject "Security" (acknowledged within 5 working days).
- Consumers can also contact ANPC (anpc.ro) or alternative dispute resolution bodies.
- The Romanian versions of the policies are legally binding; English is a convenience translation. Romanian law applies.
