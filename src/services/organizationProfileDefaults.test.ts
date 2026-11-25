import { describe, it, expect, vi, afterEach } from 'vitest';
import type { AuthUser } from './auth';
import { fetchOrganizationProfile, getDefaultOrganizationProfile, persistOrganizationProfile,
  profileToInventoryBoundary, getBoundaryMaterialFingerprint, loadOrganizationProfile, reviewOrganizationBoundary, SAMPLE_WORKSPACE_PROFILE } from './organizationProfile';
import { buildInventoryBoundary, CARBONLITE_CALCULATION_COVERAGE_LABEL, DEFAULT_INVENTORY_BOUNDARY } from '../constants/inventoryBoundary';

const user: AuthUser = { id: 'synthetic-owner', email: 'synthetic@example.invalid', role: 'ADMIN', accountType: 'CUSTOMER', organizationId: 'synthetic-org', organizationName: 'Synthetic Workshop' };
const keys = ['reportingPeriodStart','reportingPeriodEnd','geographicBoundary','includedFacilitiesOrLocations',
  'excludedFacilitiesOrLocations','includedScopes','scope3CoverageNote','exclusionsAndLimitations','boundaryNotes'] as const;
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe('customer boundary defaults', () => {
  it('starts clean customer profiles and report boundaries without sample claims', () => {
    const profile = getDefaultOrganizationProfile(user);
    for (const key of keys) expect(profile[key]).toBe('');
    expect(profile).toMatchObject({country:'Canada', boundaryStatus:'DRAFT', boundaryVersion:1, boundaryReviewedAt:''});
    const report = profileToInventoryBoundary(profile);
    expect(report).toMatchObject({ reportingPeriod:'', geographicBoundary:'', includedScopes:'', scope3CoverageNote:'' });
    expect(buildInventoryBoundary()).toMatchObject({ geographicBoundary:'', includedScopes:'' });
    expect(buildInventoryBoundary(user.organizationName)).toMatchObject({ geographicBoundary:'', includedScopes:'', reportingPeriod:'' });
    expect(CARBONLITE_CALCULATION_COVERAGE_LABEL).toBe('Scope 1, Scope 2, selected Scope 3');
  });
  it('never trusts an editable sample name, but preserves API-provided sample values', async () => {
    const collision = {...user, organizationName:SAMPLE_WORKSPACE_PROFILE.organizationName};
    for(const key of keys) expect(getDefaultOrganizationProfile(collision)[key]).toBe('');
    expect(buildInventoryBoundary(collision.organizationName).geographicBoundary).toBe('');
    localStorage.setItem('accessToken','synthetic-token');
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify(SAMPLE_WORKSPACE_PROFILE),{status:200})));
    const proven=await fetchOrganizationProfile(collision);
    for(const key of keys) expect(proven[key]).toBe(SAMPLE_WORKSPACE_PROFILE[key]);
    expect(profileToInventoryBoundary(proven).geographicBoundary).toBe(SAMPLE_WORKSPACE_PROFILE.geographicBoundary);
    for(const name of [collision.organizationName,'Renamed customer']) {
      const blank={...getDefaultOrganizationProfile(user),organizationName:name};
      expect(profileToInventoryBoundary(blank).includedScopes).toBe('');
    }
  });
  it.each([null, ''])('preserves empty customer API fields (%s) across save/reload without review or fingerprint drift', async empty => {
    localStorage.setItem('accessToken','synthetic-token'); localStorage.setItem('currentUser',JSON.stringify(user));
    let server: Record<string, unknown> = { organizationName:user.organizationName, industry:'Manufacturing', country:'Canada', provinceOrState:'Alberta',
      boundaryStatus:'DRAFT', boundaryVersion:1, ...Object.fromEntries(keys.map(key=>[key,empty])) };
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (!url.endsWith('/organization-profile')) return new Response('{}',{status:200});
      if(options?.method==='PATCH') {
        const body=JSON.parse(String(options.body));
        expect(body).not.toHaveProperty('boundaryStatus'); expect(body).not.toHaveProperty('boundaryReviewedAt');
        for(const key of keys) expect(body[key]).toBe('');
        server={...server,...body};
      }
      return new Response(JSON.stringify(server),{status:200});
    }); vi.stubGlobal('fetch',fetchMock);
    const before=await fetchOrganizationProfile(user), fingerprint=getBoundaryMaterialFingerprint(before);
    for(const key of keys) expect(before[key]).toBe('');
    await persistOrganizationProfile({ ...before, ...Object.fromEntries(keys.map(key => [key, empty])) } as typeof before,user);
    const reloaded=await fetchOrganizationProfile(user);
    expect(getBoundaryMaterialFingerprint(reloaded)).toBe(fingerprint);
    expect(reloaded).toMatchObject({boundaryStatus:'DRAFT',boundaryVersion:1,boundaryReviewedAt:''});
  });
  it('keeps valid customer text even when identical to sample descriptions', () => {
    const profile={...getDefaultOrganizationProfile(user), geographicBoundary:DEFAULT_INVENTORY_BOUNDARY.geographicBoundary,
      includedScopes:'Scope 1 and Scope 2', includedFacilitiesOrLocations:'Calgary workshop'};
    expect(profileToInventoryBoundary(profile)).toMatchObject({geographicBoundary:profile.geographicBoundary,includedScopes:profile.includedScopes});
    expect(getBoundaryMaterialFingerprint({...profile,organizationName:'Changed'})).not.toBe(getBoundaryMaterialFingerprint(profile));
    expect(buildInventoryBoundary(user.organizationName,'2025',{geographicBoundary:'',includedScopes:''})).toMatchObject({geographicBoundary:'',includedScopes:'',reportingPeriod:'2025'});
  });
});


it('normalizes nullable cached customer fields without sample fallback',()=>{
  localStorage.removeItem('accessToken');localStorage.removeItem('token');
  // Use the existing writer to establish the organization-specific cache key.
  const original=Storage.prototype.getItem;
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(function(this: Storage,key:string){
    if(key.startsWith('carbonlite.organizationProfile') || key.includes('organization-profile')) return JSON.stringify({organizationName:user.organizationName, ...Object.fromEntries(keys.map(k=>[k,null]))});
    return original.call(this,key);
  });
  const profile=loadOrganizationProfile(user);
  for(const key of keys) expect(profile[key]).toBe('');
  vi.restoreAllMocks();
});

it('normalizes nullable customer save responses without sample fallback',async()=>{
 localStorage.setItem('accessToken','synthetic-token');
 const profile={...getDefaultOrganizationProfile(user),industry:'Manufacturing',provinceOrState:'Alberta'};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({...profile,...Object.fromEntries(keys.map(k=>[k,null]))}),{status:200})));
 const saved=await persistOrganizationProfile(profile,user);
 for(const key of keys)expect(saved[key]).toBe('');
});


it('keeps nullable customer review responses empty without changing review authority',async()=>{
 localStorage.setItem('accessToken','synthetic-token');
 const profile={...getDefaultOrganizationProfile(user),industry:'Manufacturing',provinceOrState:'Alberta'};
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({...profile,boundaryStatus:'REVIEWED',...Object.fromEntries(keys.map(k=>[k,null]))}),{status:200})));
 const reviewed=await reviewOrganizationBoundary({profile,user,reviewNote:'Synthetic review fixture'});
 for(const key of keys)expect(reviewed[key]).toBe('');
 expect(reviewed.boundaryStatus).toBe('REVIEWED');
 await expect(reviewOrganizationBoundary({profile,user:{...user,accountType:'PILOT_REVIEWER'}})).rejects.toThrow('Reviewer permission required');
});
