# Street contacts and the bank heist

## Scope

Use the existing town, original criminal contacts and Grant's casework. The bank is the mod's financial-centre branch. The heist is a single final job with preparation, persistent hired crew, an operation, an optional police intervention and a single settlement.

## Decisions

- Gun damage uses a 60–100% effective skill coefficient, including the pain penalty.
- Landry retains his original −100–100 relationship and legacy work milestones. Wren retains −50–50 and the original 20/40 profit tiers. Grant remains 0–100.
- Police and criminal work remain available together. Only an observed breach of an agreement changes the opposing contact's relationship.
- Own passages contain their own actions. JSON owns prices, cuts and thresholds; TypeScript supplies state and derived values. Existing shared street combat handles resistance.
- Recruitment generates adult persistent NPCs once. Page redraws do not generate crew, reroll outcomes or issue payments.
- A chosen getaway car must exist at High Street with sufficient seats, fuel and roadworthiness. Crew identities remain in the heist rather than the transport companion list.
- Cooperation does not erase original crime evidence. The police may interrupt the heist; the original station and sentence rules remain authoritative.

## Inspiration

GTA V's preparation and specialist crew with differing skills and cuts inform the structure ([Rockstar's official previews](https://www.rockstargames.com/newswire/article/o349k552514927/worldwide-grand-theft-auto-v-previews.html)). Dialogue and character roles are written for DoL rather than copied from GTA.

## Verification

Use existing check/build/package commands and temporary external native SugarCube probes. Static and package checks do not substitute for full mod-loader save/play testing.

## Enrichment after the first playable chain

- Turn the three preparation flags into actual short scenes at the bank and pub. The PC chooses how to investigate, check supplies and rehearse with the saved crew.
- Normalize physique to the original body-size maximum; use effective skills, condition penalties and crew contributions with bounded probabilities.
- Separate private information from an explicit police operation agreement. Being challenged allows negotiation, withdrawal or resistance; violence follows a player's choice.
- Offer lighter and larger hauls, and a slower retreat that trades money/time for reliability. Preserve saved rolls and one-time growth.
- Show the bank incident, temporary counter disruption and witnessed staff reactions without confiscating unrelated balances or inventing ownership of the branch.
- Keep Mickey as the original persistent hacker. The arranged underground meeting and one optional paid review reuse the existing identity and hiding states; original fame work stays at the Harvest Street pub.
- Respect daytime preparation meetings, original bank hours and completed transport trips; an active operation has a continuation route during the counter closure.
- Reach the smugglers' pub by the original route for preparation and settlement. Escaping the bank returns to the surface street before any money is divided.
