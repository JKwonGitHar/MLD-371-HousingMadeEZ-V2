# AI adoption Constitution for Harvard Kennedy School International Student Groups

**Organization:** Harvard Kennedy School International Student Groups<br>
**Name of Team members:** Eze Chukwu, Elsa Nisa, Andrea Pavlick, John Kwon, Mustafa Naqvi

> This constitution outlines the capabilities, risks, disclosure standards, judgment, and decision-making process guiding the AI features integrated into our platform, Housing Made Easy. As a collective dedicated to helping international students transition smoothly to academic life, we collect, store, and process personal data using AI models to optimize user support across all platform modules. Throughout this workflow, we implement clear data hand-off and safeguarding mechanics to ensure sensitive information remains protected. Our overarching goal is to pair rigorous data privacy and security with an intuitive, user-friendly experience.
>
> This constitution will be reviewed and verified every new school year to ensure it remains current and aligned with applicable policies.

---

## I. Capability

### What is AI capable of doing across the Housing Made Easy modules to support our core organizational mission?

Our core organizational mission is to provide information to international students arriving at the Harvard Kennedy School of Government so they can successfully navigate their relocation to Cambridge.

**1. Which tasks (or types of tasks) in this organization can AI be used for? Be specific.**

- **Lease Checker:** Assess uploaded student leases for completeness, unusual clauses, scam warnings, and compliance with Massachusetts tenant laws; generate visual summaries with recommended next steps; and offer an interactive chatbot to answer student questions.
- **Scam Awareness (Non-AI):** Provide checklists and direct links to available scam prevention and reporting resources.
- **Housemate Finder:** Automatically pre-fill profile forms and provide translation tools for non-native English speakers.
- **Furniture Finder:** Match available furniture between outgoing and incoming students, with reservation tracking and visual measurement tools.

**2. What is the evidence, if any, that the tool is better at each task than the current process? How should efficacy/accuracy be tested?**

- **Lease Checker:** AI reads long leases and identifies key clauses or legal compliance requirements more efficiently than manual review. Accuracy is tested using a test set of actual and LLM-generated synthetic leases with known warning flags.
- **Scam Awareness (Non-AI):** Efficacy is evaluated by measuring student engagement with direct reporting links and tracking reductions in reported scam incidents compared to unguided searches.
- **Housemate Finder:** Translation tools assist non-native English speakers in communicating smoothly. Accuracy and user satisfaction are evaluated through profile completion rates and user feedback on translation clarity.
- **Furniture Finder:** Provides a centralized platform for outgoing and incoming HKS students, yielding higher match rates than external marketplaces like Craigslist or Facebook Marketplace. Success is measured by successful furniture matches and total platform listings.

**3. What is explicitly off the table in terms of AI use on the platform, and why? (e.g. ILA prohibited automation around clerical work)**

- **Legal & Binding Agreements:** AI cannot provide legal advice, enter into legally binding agreements or automatic contracts, or make commitments on behalf of students.
- **Payments & Transactions:** AI is strictly prohibited from completing or executing any payment transactions.
- **Communications & Personal Interactions:** AI cannot respond back or contact individuals on a user's behalf, agree to introductions, or make social or personal commitments that require genuine human interaction and decision-making.
- **Discriminatory Filtering:** Matching and filtering based on protected or sensitive personal traits, such as race, nationality, religion, or gender, is prohibited; matching must rely solely on lifestyle preferences explicitly shared by users.

**4. Where does the organization’s data live, who owns it, and what may the tool read, write, or send?**

- **Lease Checker Module:** Uploaded lease documents are read and processed by AI to provide the analysis and allow the user to ask questions about the lease; personal data and/or lease documents are not stored in a central database.
- **Furniture Finder Module:** Listings and inventory data are hosted in a centralized document (e.g., Google Sheets) owned and managed by designated incoming student administrators with full access rights.

- **Housemate Finder Module:** Student profile information resides locally within the user's browser; text transmitted to AI model APIs for translation or matching is not retained, while operational platform data is stored securely in designated cloud storage.

## II. Risk and disclosure

**1. For each permitted use: what is the worst plausible failure and how would your org know it happened?**

- **Worst Plausible Failures:** Critical platform failures include failing to identify housing scam clauses or unlawful lease terms, providing inaccurate summaries or unverified advice relied upon by students, inadvertently exposing user-posted content or centralized databases containing sensitive personally identifiable information (PII), translation and communication errors causing financial or interpersonal disputes, misrepresenting item availability or dimensions, and hosting security vulnerabilities that compromise organizational data. These issues would be detected through security monitoring, audit logs, student feedback, and support tickets.

**2. Under what conditions, and to what extent, should AI use be disclosed? (WGA model: disclosure is mandatory, and workers can refuse to use AI)**

- **Disclosure Standards:** Mandatory disclosure notices are displayed across the platform before users upload documents or interact with features. Users are clearly informed whenever automated analysis, AI-assisted translation, profile pre-filling, or smart matching tools are utilized, ensuring content can be reviewed and approved prior to submission.

**3. What are the risks to the people inside the organization, e.g. deskilling, surveillance, workload shifted rather than reduced, jobs reorganized out of existence, etc.? (Nurse’s union demand was a pause until these questions were satisfactorily answered)**

- **Organizational & Internal Risks:** Key internal risks include legal and reputational exposure if automated outputs are mistaken for formal legal or financial advice, along with long-term maintenance, technical debt, and system continuity challenges arising from annual student leadership rotations.

**4. Privacy and consent: whose data is in the system, are they aware of it, and can they request to delete/remove it?**

- **Privacy & Data Ownership:** Uploaded documents (such as lease files) are read and processed with AI but are not retained in central databases. When operated within the Harvard University sandbox, uploaded information is not used to train public models. Platform profile, listing, and operational data are stored securely in local browser storage and managed cloud storage, and users retain complete control to update, edit, or permanently request deletion of their data at any time.

| Risk Type | Direct Risks | Indirect Risks |
|---|---|---|
| **Intentional** | <ul><li>Bad actors uploading fake listings, predatory lease clauses, or scam attempts directly through platform tools.</li><li>Bad actors creating fake profiles/emails to harvest PII and target international students.</li></ul> | Users exploiting matched housing or housemate profiles to bypass platform safety guidelines or organize off-platform scams. |
| **Unintentional** | <ul><li>LLM hallucination or translation errors misinterpreting key lease terms, dimensional measurements, or legal notices.</li><li>LLM is hacked and scams international student.</li><li>AI translation or profile pre-filling errors miscommunicating lifestyle habits, financial splits, or cleanliness standards, leading to immediate living friction.</li></ul> | <ul><li>Student over-reliance on AI checks leading to skipped independent human verification and subsequent lease disputes.</li><li>Spread of bedbugs, allergens or other unpleasantness when moving furniture</li><li>Cultural misunderstandings exacerbated by housemate matches.</li></ul> |

## III. Judgment

**1. Which decisions must a person (not robot) make and why?**

To safeguard user autonomy, maintain compliance, and foster trust, critical operational, financial, and policy decisions across Housing Made Easy are strictly reserved for human decision-makers:

- **Legal & Regulatory Advice:** AI tools must never offer formal legal counsel or bind the organization. Automated checks assist in identifying clauses, but formal advice remains reserved for human legal professionals or referral services.
- **Financial Transactions & Payments:** Users must independently evaluate pricing, choose payment methods, and initiate or finalize all financial transactions across all platform modules.
- **Formal Agreements & Commitments:** Entering into binding lease agreements, signing contracts, reserving furniture, or making social commitments must be executed directly by human users.
- **Platform Governance & Policies:** Human administrators determine all terms, code of conduct, and operational guidelines governing the site, social media, and community spaces.
- **Access Control & Membership Limits:** Decisions regarding authentication methods, user access permissions, and participant capacity limits across community pages are managed strictly by human team members.

**2. How will the organization know whether staff are exercising judgment or outsourcing it?**

- The site will have guardrails, but the end user will be responsible for using the site responsibly.
- We will provide a Standard Operating Procedure with sample data sets that can be used to validate that the tool is working within the guardrails.

## IV. Power (Who decides and with what authority?)

**1. Who needs to approve this policy, and who should be consulted? Staff, members, the people the organization serves, the board?**

- **Approval Authorities:** Formal approval is required from the student leadership team managing Housing Made Easy.

**2. How does this policy change who has power inside the organization and in its relationships: with members, with funders, with other entities with which it works?**

- Housing Made EZ empowers international students as they navigate the complicated Boston housing market. It shifts power over information to international students.

## V. Risks we considered

This section records the risk assessment we carried out for the Furniture Finder module, and the decision we made for each risk that scored 4 or higher.

### Purpose and scope

We assessed each risk by multiplying likelihood (1-3) by harm (1-3). Every risk with a score of 4 or higher is tied to one decision: Avoid, Reduce, or Accept.

- **Avoid.** We will not collect, store, or do this.
- **Reduce.** We will do this, with a named safeguard: retention limit, access list, consent step, human review, mandatory training, or an audit log that someone actually reads.
- **Accept.** We will do this, knowing the risk, because [reason]. We name who in the organization has to sign off on this.

### Data inventory

| # | What | Who it is about | Where it lives | Who can see it today |
|---|------|-----------------|----------------|----------------------|
| 1 | Simulated data | Potential names and contact info for sellers and buyers | Team Google Drive | No one yet; public during the test, so anyone |
| 2 | Planned Google Sheet | Sellers and buyers | Team Google Drive | No one yet; once live, everyone with access to the sheet |
| 3 | Website log | IP addresses | GitHub | Only GitHub |

### Risk decisions

Six risks have scores of 4 or higher. For five of these risks, we will work to Reduce. For one of these risks, we will work to Avoid.

| # | Risk | Score | Decision | Commitment | Owner |
|---|------|-------|----------|------------|-------|
| 1 | Another person's contact info entered in a listing | 6 | Reduce | Buyers use a relay form; raw contact details are never shown. Sellers confirm their Harvard email by link before a listing goes live. Listings expire after 30 days. A moderator removes flagged listings within 24 hours. | Andrea |
| 2 | Stalking or harassment through the site | 6 | Reduce | A report button, a block list and human review. Only two named moderators can see poster and reporter details, and the access list is reviewed each term. The report log is read weekly. | Andrea |
| 3 | Fake listings | 4 | Reduce | Verified Harvard email, a "report this listing" flag, and moderator review of flagged items. The site handles no payments or deposits. | John |
| 4 | Account compromise or ransomware | 6 | Reduce | Two-factor authentication on every team account, a short editor list, a weekly export of the sheet to a second location, and one restore test before launch. | Elsa |
| 5 | Public-sheet exposure and scraping | 9 | Avoid | No real personal data in any publicly readable sheet. The test uses labeled simulated data only; after launch the sheet is restricted to named accounts. Removed from scope: public access to personal data. | Eze |
| 6 | Credential leak | 6 | Reduce | GitHub secret scanning and push protection on; no keys in the repo; access list reviewed each term. | Eze |

No risk is currently marked Accept. Any future Accept must state its reason and name the person who signs off.

**Review.** The team re-scores every risk after safeguards are in place and reviews this policy each term and after any incident. If a safeguard does not lower its score, it is replaced.

**Retention.** Listings expire after 30 days. Contact data and reports are deleted when a listing expires or a report is closed. When the team graduates or disbands, the sheet and repo are either handed to a named successor or deleted.

<br>
<br>

---

<sub><b>AI Use Disclosure</b></sub>

<sub>Each member of our group was assigned to one of the issues: the lease checker, the furniture finder, the housemate finder, and scams. We developed and drafted the AI policy based on our assigned issue. We used AI to integrate the drafts from each section into a single AI policy, as we view this as a single website policy. We then used AI to turn it from a Word document (.docx) into this Markdown (.md) file. We also used AI to merge our separate risk assessment for the Furniture Finder (Section V) into this file, and to adjust its headings and wording so the two parts read as one document.</sub>
