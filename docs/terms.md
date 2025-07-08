# Term Definitions

## Various Keyholders

### Core

The **Core Authority** is the root of trust for the entire system.  
Its only responsibility is to manage and appoint Root Authorities.

### Root Authority

**Root Authorities** form the council that governs the ledger's top-level structure.  
They approve the creation of new top-level scopes and manage policies for those scopes.  
All decisions are made by quorum (currently 3-of-5). Root Authorities also appoint top-level Custodians.

### Custodian

**Custodians** are responsible for managing keys and policies within the scope they are assigned to.  
Their decisions follow the scope's defined policy (e.g., unanimous quorum, 1-of-1, etc.). Custodians also sign off on submitted records. (custodian_key, custodian_signature in record)

---

## Agent

**Agents** are entities that do not hold governance rights over a scope but are granted specific operational permissions.

### Contributor

A **Contributor** is authorized to append records to a scope.  
This role does **not** imply read access. Contributors are typically users, applications, or devices that write to the ledger.

### Observer

An **Observer** is authorized to read from the scope at the ledger level.  
Other application-level controls or encryption layers may further restrict what they can access.

## Workers
