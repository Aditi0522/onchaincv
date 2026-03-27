#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Vec,
};

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_ENTRIES:  u32 = 20;
const MAX_STR_LEN:  u32 = 80;
const MAX_DESC_LEN: u32 = 200;

#[contracttype]
#[derive(Clone)]
pub struct WorkEntry {
    pub id:          u32,
    pub title:       String,   // job title
    pub company:     String,   // company name
    pub description: String,   // what you did
    pub from_year:   u32,
    pub to_year:     u32,      // 0 = present
    pub is_current:  bool,
    pub added_at:    u64,      // ledger timestamp
}

#[contracttype]
#[derive(Clone)]
pub struct Profile {
    pub owner:    Address,
    pub name:     String,   // display name
    pub headline: String,   // one-liner
    pub website:  String,   // optional URL
}

#[contracttype]
pub enum DataKey {
    Profile(Address),
    Entries(Address),   // Vec<WorkEntry>
    TotalProfiles,
}

#[contract]
pub struct OnChainCVContract;

#[contractimpl]
impl OnChainCVContract {
    /// Set or update the profile header
    pub fn set_profile(
        env: Env,
        owner: Address,
        name: String,
        headline: String,
        website: String,
    ) {
        owner.require_auth();
        assert!(name.len() <= MAX_STR_LEN,     "Name too long");
        assert!(headline.len() <= MAX_STR_LEN, "Headline too long");
        assert!(website.len() <= MAX_STR_LEN,  "Website too long");

        let is_new = !env.storage().persistent().has(&DataKey::Profile(owner.clone()));

        let profile = Profile { owner: owner.clone(), name, headline, website };
        env.storage().persistent().set(&DataKey::Profile(owner.clone()), &profile);

        if is_new {
            let n: u32 = env.storage().instance()
                .get(&DataKey::TotalProfiles).unwrap_or(0u32);
            env.storage().instance().set(&DataKey::TotalProfiles, &(n + 1));
        }

        env.events().publish((symbol_short!("profile"),), (owner,));
    }

    /// Add a work entry to the CV
    pub fn add_entry(
        env: Env,
        owner: Address,
        title: String,
        company: String,
        description: String,
        from_year: u32,
        to_year: u32,
        is_current: bool,
    ) -> u32 {
        owner.require_auth();
        assert!(title.len()       <= MAX_STR_LEN,  "Title too long");
        assert!(company.len()     <= MAX_STR_LEN,  "Company too long");
        assert!(description.len() <= MAX_DESC_LEN, "Description too long");
        assert!(from_year >= 1900 && from_year <= 2100, "Invalid from_year");
        assert!(to_year   == 0   || (to_year >= from_year && to_year <= 2100), "Invalid to_year");

        let mut entries: Vec<WorkEntry> = env.storage().persistent()
            .get(&DataKey::Entries(owner.clone()))
            .unwrap_or(Vec::new(&env));

        assert!(entries.len() < MAX_ENTRIES, "Max 20 entries per CV");

        let id = entries.len() as u32 + 1;
        let entry = WorkEntry {
            id,
            title,
            company,
            description,
            from_year,
            to_year,
            is_current,
            added_at: env.ledger().timestamp(),
        };

        entries.push_back(entry);
        env.storage().persistent().set(&DataKey::Entries(owner.clone()), &entries);

        env.events().publish((symbol_short!("entry"),), (owner, id));
        id
    }

    /// Remove an entry by ID (shifts remaining IDs)
    pub fn remove_entry(env: Env, owner: Address, entry_id: u32) {
        owner.require_auth();

        let mut entries: Vec<WorkEntry> = env.storage().persistent()
            .get(&DataKey::Entries(owner.clone()))
            .expect("No entries found");

        let mut idx_to_remove = None;
        for i in 0..entries.len() {
            if entries.get(i).unwrap().id == entry_id {
                idx_to_remove = Some(i);
                break;
            }
        }

        assert!(idx_to_remove.is_some(), "Entry not found");
        entries.remove(idx_to_remove.unwrap());
        env.storage().persistent().set(&DataKey::Entries(owner), &entries);
    }

    // ── Reads ──────────────────────────────────────────────────────────────
    pub fn get_profile(env: Env, owner: Address) -> Option<Profile> {
        env.storage().persistent().get(&DataKey::Profile(owner))
    }

    pub fn get_entries(env: Env, owner: Address) -> Vec<WorkEntry> {
        env.storage().persistent()
            .get(&DataKey::Entries(owner))
            .unwrap_or(Vec::new(&env))
    }

    pub fn total_profiles(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalProfiles).unwrap_or(0u32)
    }
}
