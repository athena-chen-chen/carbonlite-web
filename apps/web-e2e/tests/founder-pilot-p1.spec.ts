import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { createCarbonLiteApiState, installCarbonLiteApiMock } from '../support/mock-api';

test('synthetic reporting keeps applied period, totals and unassessed Scope 3 through PDF/CSV export', async ({page},testInfo)=>{
  const state=createCarbonLiteApiState();
  const rows=[{id:'synthetic-electricity',activityType:'ELECTRICITY',recordDate:'2026-01-31',quantity:3650,unit:'kWh',emissions:1598.7,scope:'SCOPE_2',factorValue:.438},{id:'synthetic-gas',activityType:'NATURAL_GAS',recordDate:'2026-03-31',quantity:2860,unit:'m3',emissions:5640.80946,scope:'SCOPE_1',factorValue:1.972311}];
  await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return route.continue();
    return route.abort();
  });
  await page.addInitScript(()=>{
    localStorage.setItem('accessToken','synthetic-local-browser-token');
    localStorage.setItem('currentUser',JSON.stringify({id:'synthetic-user',email:'synthetic@example.invalid',role:'ADMIN',membershipRole:'OWNER',platformRole:'USER',accountType:'CUSTOMER',organizationId:'organization-1',organizationName:'Prairie Example Workshop'}));
  });
  await installCarbonLiteApiMock(page,state);
  await page.route('**/api/activity-data?*',route=>route.fulfill({json:{items:rows.map(r=>({...r,sourceType:'MANUAL'})),total:2,page:1,pageSize:100,totalPages:1}}));
  await page.route('**/api/activity-data',route=>route.fulfill({json:{items:rows.map(r=>({...r,sourceType:'MANUAL'})),total:2,page:1,pageSize:100,totalPages:1}}));
  const requests: URL[]=[];
  await page.route(/\/api\/metrics\/(summary|calculation-summary)(\?.*)?$/,route=>{
    const u=new URL(route.request().url());requests.push(u);
    const selected=rows.filter(r=>(!u.searchParams.get('periodStart')||r.recordDate>=u.searchParams.get('periodStart')!)&&(!u.searchParams.get('periodEnd')||r.recordDate<=u.searchParams.get('periodEnd')!));
    const details=selected.map(r=>({...r,sourceReference:r.id,activityDataId:r.id,activityQuantity:r.quantity,activityUnit:r.unit,status:'CALCULATED',calculationStatus:'CALCULATED',calculatedEmissionsKgCO2e:r.emissions,calculatedEmission:r.emissions,factorDefaultScope:r.scope,factorId:`factor-${r.id}`,factorName:'Synthetic reviewed factor fixture',factorInputUnit:r.unit,factorResultUnit:'kgCO2e',factorVerified:true,sourceAuthority:'Synthetic local test fixture',sourceDocument:'Synthetic factor evidence',sourceYear:2026,sourceType:'MANUAL',jurisdiction:'Alberta, Canada',jurisdictionCountry:'Canada',jurisdictionRegion:'Alberta',facilityName:'Demo Calgary Workshop'}));
    return route.fulfill({json:{activities:selected.map(r=>({...r,sourceType:'MANUAL'})),calculationDetails:details,records:details,totalEstimatedEmissionsKgCO2e:selected.reduce((n,r)=>n+r.emissions,0),totalRecordsFound:2,recordsInScope:selected.length,recordsCalculated:selected.length,processedRecords:selected.length,skippedRecords:0,missingFactorCount:0,missingFactors:[],conversionFactorsUsed:[]}});
  });
  await page.goto('/metrics-summary');
  await expect(page.locator('body')).toContainText('7,239.51');
  const dates=page.locator('input[type=date]');
  await dates.nth(1).fill('2026-01-31');await dates.nth(1).blur();
  await expect.poll(()=>requests.at(-1)?.searchParams.get('periodEnd')).toBe('2026-01-31');
  await page.getByRole('link',{name:'Generate Report',exact:true}).click();
  await expect(page.getByRole('button',{name:'Export reports'})).toBeEnabled();
  expect(requests.at(-1)?.searchParams.get('periodStart')).toBe('2026-01-01');
  expect(requests.at(-1)?.searchParams.get('periodEnd')).toBe('2026-01-31');
  await expect(page.locator('body')).toContainText('2026-01-01 to 2026-01-31');
  await expect(page.locator('body')).toContainText('Not assessed');
  await page.screenshot({path:testInfo.outputPath('synthetic-preview.png'),fullPage:true});
  for(const [menu,file] of [['Technical Emissions Report (PDF)','technical.pdf'],['Executive Summary (PDF)','executive.pdf'],['Data Export (CSV)','activities.csv']]){
    await page.getByRole('button',{name:'Export reports'}).click();
    const event=page.waitForEvent('download');await page.getByRole('menuitem',{name:menu,exact:true}).click();const download=await event;
    await download.saveAs(testInfo.outputPath(file));
    expect((await fs.stat(testInfo.outputPath(file))).size).toBeGreaterThan(100);
  }
  const csv=await fs.readFile(testInfo.outputPath('activities.csv'),'utf8');
  expect(csv).toContain('synthetic-electricity');expect(csv).not.toContain('synthetic-gas');
});
