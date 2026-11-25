import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { goldenReport } from '../pdf/__tests__/goldenFixtures';
import { buildCanonicalReportData } from './buildCanonicalReportData';
import { buildExecutiveSummaryPdf, buildTechnicalReviewPdf } from '../pdf';
import { aggregateActivityUsage } from '../../utils/activityAggregation';
import { buildPilotCsv } from '../../utils/reportCsvExport';
import type { CalculationAuditDetail } from '../../services/metrics';

function pdfText(pdf: ReturnType<typeof buildTechnicalReviewPdf>) {
  return [...pdf.output().matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(m=>m[1].replace(/\\([()\\])/g,'$1')).join(' ');
}
const details = [
  {activityDataId:'synthetic-electricity',activityType:'ELECTRICITY',recordDate:'2026-01-31',activityQuantity:3650,activityUnit:'kWh',factorValue:.438,factorDefaultScope:'SCOPE_2',calculatedEmissionsKgCO2e:1598.7},
  {activityDataId:'synthetic-gas',activityType:'NATURAL_GAS',recordDate:'2026-03-31',activityQuantity:2860,activityUnit:'m3',factorValue:1.972311,factorDefaultScope:'SCOPE_1',calculatedEmissionsKgCO2e:5640.80946},
].map(row=>({...row,factorId:`synthetic-factor-${row.activityType}`,status:'CALCULATED',sourceType:'MANUAL',sourceReference:row.activityDataId,facilityName:'Demo Calgary Workshop',factorName:'Synthetic regression fixture',factorInputUnit:row.activityUnit,factorResultUnit:'kgCO2e',factorSource:'Synthetic fixture only',sourceAuthority:'Synthetic fixture only',jurisdictionCountry:'Canada',jurisdictionRegion:'Alberta'})) as CalculationAuditDetail[];

describe('Founder Pilot synthetic output scope',()=>{
 it.each(['annual','January'] as const)('keeps %s totals, dates and disclosures consistent across both PDFs and CSV',period=>{
  const {input}=goldenReport('enmax');
  const rows=period==='annual'?details:details.slice(0,1),end=period==='annual'?'2026-12-31':'2026-01-31';
  const total=rows.reduce((n,r)=>n+Number(r.calculatedEmissionsKgCO2e),0);
  const report=buildCanonicalReportData({...input,organization:{name:'Prairie Example Workshop',id:'synthetic-workspace',generatedBy:'synthetic@example.invalid'},calculationDetails:rows,activities:rows.map(r=>({id:r.activityDataId!,activityType:r.activityType!,recordDate:r.recordDate!,quantity:r.activityQuantity!,unit:r.activityUnit!,sourceType:'MANUAL'})),matchedActivityEmissions:rows.map(r=>({activityDataId:r.activityDataId,activityType:r.activityType,quantity:r.activityQuantity,unit:r.activityUnit,factorId:`synthetic-factor-${r.activityType}`,estimatedEmissionsKgCO2e:r.calculatedEmissionsKgCO2e!,sourceType:'MANUAL'})),conversionFactorsUsed:rows.map(r=>({factorId:`synthetic-factor-${r.activityType}`,factorName:r.factorName!,factorValue:r.factorValue!,inputUnit:r.factorInputUnit!,resultUnit:r.factorResultUnit!,jurisdiction:'Alberta, Canada',sourceAuthority:'Synthetic fixture only',sourceYear:2026,factorType:'System' as const,verified:true})),reviewRows:[],countSummary:{totalRecordsFound:rows.length,processedRecords:rows.length,skippedRecords:0,missingFactorRecords:0,skippedReasons:{missingFactor:0,outsideDateRange:0,outsideScope:0,invalidData:0}},usageTotals:aggregateActivityUsage(rows.map(r=>({activityType:r.activityType,quantity:r.activityQuantity,unit:r.activityUnit}))),totalEstimatedEmissionsKgCO2e:total,reportingPeriod:{startDate:'2026-01-01',endDate:end,label:`2026-01-01 to ${end}`},inventoryBoundary:{...input.inventoryBoundary,organizationWorkspace:'Prairie Example Workshop',industry:'Manufacturing',country:'Canada',provinceOrTerritory:'Alberta',city:'Calgary',geographicBoundary:'One fictional Calgary manufacturing workshop.',includedFacilitiesOrLocations:'Demo Calgary Workshop only.',excludedFacilitiesOrLocations:'All other locations.',exclusionsLimitations:'Synthetic selected activities; Scope 3 excluded; not independently assured.',reportingPeriod:`2026-01-01 to ${end}`,includedScopes:'Scope 1 natural gas and Scope 2 electricity',scope3CoverageNote:'Scope 3 excluded from this synthetic demonstration.',boundaryStatus:'DRAFT',boundaryNotes:'Fictional selected activities only; not a complete annual inventory. Not independently assured.'}});
  expect(report.inventory.totalKgCO2e).toBe(total);
  expect(report.factorReview.factors).toHaveLength(rows.length);
  expect(report.matchedActivityEmissions.map(r=>r.quantity)).toEqual(rows.map(r=>r.activityQuantity));
  if(period==='annual')expect(report.scopeSummary).toMatchObject({'Scope 1':5640.80946,'Scope 2':1598.7});
  expect(report.scopeBreakdown.coverage?.['Scope 3'].state).toBe('NOT_ASSESSED');
  for(const [kind,pdf] of [['technical',buildTechnicalReviewPdf(report)],['executive',buildExecutiveSummaryPdf(report)]] as const){
   const text=pdfText(pdf);expect(text).toContain('Not assessed');expect(text).toContain('Pilot Draft');expect(text).toContain('Not reviewed');expect(text).toContain('2026-01-01');expect(text).toContain(end);
   if(process.env.PILOT_P1_PDF_DIR)writeFileSync(`${process.env.PILOT_P1_PDF_DIR}/${period}-${kind}.pdf`,Buffer.from(pdf.output('arraybuffer')));
  }
  const csv=buildPilotCsv(report);expect(csv).toContain('synthetic-electricity');if(period==='January')expect(csv).not.toContain('synthetic-gas');
 });
});
