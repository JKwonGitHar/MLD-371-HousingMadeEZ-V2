# Housing Made Easy: Midpoint Memo

*Eze Chukwu, John Kwon, Mustafa Navqui, Elsa Nisa, Andrea Pavlick*

## 1. End-to-end process map

The process map includes 7 swim lanes. It begins with a triage of the Harvard University international student population after being admitted and attempting to find out what to do as it relates to housing. Options are:

1. Harvard University Housing
2. Harvard sublets and off-campus listings
3. Licensed brokers and agents
4. Roommates and shared housing
5. Temporary housing while a student searches
6. Safe private landlords
7. Unsafe landlords or scams

Each have their own pathways and respective outcomes; respective outcomes are:

1. Housing through Harvard
2. Short-term home secured
3. Housed with a verified lease through an agent or broker
4. Shared home secured
5. Housed with a verified lease directly with a private landlord
6. Break the lease or recover due to an unsafe landlord or scam

Please note that since we are working directly with international students to solve this problem, there is not an existing end-to-end process map for us to compare our process map with. However, we have one first person account of an international student and spouse relocating to Cambridge and making housing arrangements in the local market. That student did not initially use Harvard University Housing. The detailed account, not included here, describes several issues encountered when looking for an apartment and roommates, dealing with a difficult landlord, and understanding lease documents. In comparison, the process map shows a simpler, more standardized process that does not include misleading ads, unscrupulous landlords, misunderstanding of how utilities would be charged, etc. The process map does not contain all potential pitfalls or the consequences for the international student trying to navigate the Cambridge-Allston rental housing market; however, it does provide a good understanding of the potential general pathways that an international student would pass through when going through the housing process.

## 2. Categorized frictions

There are several points of friction that an international student would come against when attempting secure housing immediately after accepting the offer of admission. International students would have to deal with issues that other students would have to experience such as navigating the Harvard Housing Lottery, reviewing the Harvard Housing Lease, finding a roommate, and working to secure housing through an agent or directly with a landlord. Additional items that this type of student would be working through would be understanding the typical leasing documents and process in the United States, applying for housing without US credit history, establishing a new U.S. bank account, and working through suspicious housing listings or scams.

Regarding understanding a lease, reading hundreds of pages of formal contract documents in English which may not be an incoming student's native language is bad friction. It is unreasonable to expect that an international student will understand the local rental market and applicable laws. AI can help international students understand these documents and flag potential issues within a lease. However, anything that involves entering a formal or informal agreement, a payment, making appointments, is good friction and should be managed by people.

## 3. The prototype

### 3.1. Core priority realignment

- **From Pre-Lease Defense to Post-Lease Settlement:** The initial background brief prioritized pre-signing hurdles (scams, banking, lease comprehension). Empirical data inverted this hierarchy: setting up a shared home post-lease represents the dominant friction.
- **Top Friction Points:**
  - **Finding Furniture (55%, 12/22):** The largest reported challenge, elevated from a secondary/later phase to an essential core deliverable.
  - **Finding Roommates (45%, 10/22):** The second largest pain point; 9 respondents co-identified both furniture and roommate hurdles.
- **De-Prioritized Hypotheses:**
  - **Scams (5%, 1/22):** Documented at a much lower frequency than anticipated, largely because 64% (14/22) of the sample secured university housing, buffering them from predatory open-market tactics.
  - **Banking:** Generated only one unprompted mention, confirming it as a niche/early administrative task rather than an ongoing operational barrier.

### 3.2. Survey findings show emerging needs

- **Off-Campus Friction Concentration:** Off-campus students experienced significantly higher friction (averaging 2.9 challenges vs. 1.9 for university housing), particularly regarding utility surprises (38% vs. 7%) and furniture sourcing (75% vs. 43%).

### 3.3. Prototype alignment and strategic gaps

| Domain | Survey Severity | Current Prototype Asset | Alignment & Action Required |
|---|---|---|---|
| **Furniture** | **55%** (High) | Furniture Process Map & Board Prototype | Validate whether to maintain an active peer-to-peer exchange or pivot to a curated referral model. |
| **Roommates** | **45%** (High) | Housemate Navigator & Roommate Board | Consolidate with furniture |
| **Lease Literacy** | **32%** (Moderate) | LeaseCheck Boston & Lease Glossary | Create a tool that can parse thought leases (LeaseCheckBoston tool) |
| **Post-Move-In & Landlords** | **27%** (Emerging) | Agent Verification Checklist | **Key Gap:** Lacks tooling for post-move-in disputes, maintenance escalation, utility reconciliation, and deposit recovery. (How do we create a tool for this issue, or do we focus on the current processes we have?) |

### 3.4. Actionable next steps

1. **Scope Resolution:** Focus on how we will use the furniture board.
2. **Targeted Usability Testing:** Run structured prototype tests of the website that includes the tools made by us with the 7 respondents who opted into follow-up research.

![Bar chart: share of 22 international graduate students naming each housing challenge. Finding furniture 55%, finding roommates 45%, understanding the lease 32%, landlord or property management 27%, location or safety 23%, unexpected utility costs 18%, got scammed 5%.](images/survey-challenges.png)

### From the survey we decided to build

We built a prototype platform to help international students navigate the relocation lifecycle, featuring tools for lease review (LeaseCheck), a housemate navigator and board, a peer-to-peer furniture exchange, neighborhood comparison data, a community discussion board, and a scam avoidance resources. The community board has an access function that requires a Harvard Key login to access.

We started the project with very big ideas intending to find the limits of what LLMs could do. We surveyed international students to understand their housing concerns. We then decided to develop prototypes for the most highly reported concerns. We also decided to include how international students can identify and avoid scams in our prototype. While this was not reported by many students as a concern, the potential adverse consequences are significant. It seemed like a good idea to at least raise awareness of potential scams on the website.

With regard to the reviewing and understanding leases, LLMs seem to be a good fit. It was possible to scrape relevant information about legal standards and common pitfalls in the Boston rental market. It is easy to upload a lease into the application and the application can flag missing or suspicious information. The application can also classify the information as potential indication of a scam, something of concern, a point to clarify with the landlord, etc. When tested on a Harvard University Housing lease, the application found items of concern which could indicate that the prototype is not well calibrated since HUH leases should be complete and issue free. It was easy to add a way to ask questions about the lease and get answers, and to have those answers reference other resources as applicable.

What didn't work well was being able to translate the lease. Language translation was not as seamless as anticipated. This was surprising as language translation is something that most people would assume LLMs could do easily. It was also surprising to see how quickly a prototype can be built and how hard it is to determine if there are any functioning guardrails in the prototype.

## 4. Proposed scope for final deliverable

For the final product, our scope is a website that walks international students through the housing process, with a page for each stage of the move. It has five interactive tools:

- **Furniture board:** students who are leaving list items, and incoming students reserve them for their arrival date, with shared moving days for pickup.
- **Housemate Navigator and roommate board:** a guided tool that matches students on budget, area, move-in date and living habits and helps them check people out, plus a board for posting.
- **Agent verification check:** on the scams page, a step-by-step check for verifying an agent before paying anything, alongside Boston's warning signs and links to the city property lookup.
- **LeaseCheck:** students upload a lease (PDF, Word, or photos) or paste its text. LeaseCheck flags missing required parts, illegal or misleading clauses, upfront costs above what the law allows, and scam warning signs, and explains what to do next and drafts questions to ask the landlord. For the final version, we will remove the language option and probably the question related to the apartment location. We will keep the question regarding where the student is in the lease process, because the advice changes with that answer.
- **Community board:** students can ask questions, share tips and post scam warnings, sorted by the seven housing pathways on our journey map. It blocks posts that include phone numbers or email addresses, and only Harvard students can join, through the Harvard Key sign-in platform.

Several features still run as prototypes. LeaseCheck's live analysis currently works only inside the Claude app, so the public site shows a sample lease. The community board's Harvard Key sign-in is simulated. The furniture and community boards save posts only in each visitor's own browser.

To validate the lease tool, we will collect more real leases as a test set. We will also write fake leases with deliberately missing and misleading terms, to confirm LeaseCheck catches them.

Our current goal is to run focus groups with students who were not involved in building the tools, starting with the seven survey respondents who offered to talk, and use their feedback to improve the site.
