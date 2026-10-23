import {expect,test,type Page} from '@playwright/test';
import {guardRuntime} from './runtime-guards';
const widths=[320,375,390,412,768,1024,1440];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function install(page:Page,role:'student'|'platform_admin',kind='course',withEvidence=false){
  const user={id:'synthetic-buyer',email:'buyer@example.test',fullName:'Người dùng thử nghiệm',status:'active',roles:[role],createdAt:'2026-10-01',updatedAt:'2026-10-01'};
  await page.addInitScript(session=>localStorage.setItem('eduai.auth.session.v1',session),JSON.stringify({accessToken:'synthetic-test-only',refreshToken:'',tokenType:'Bearer',expiresIn:3600,user}));
  const state={state:'ACCESS_UNVERIFIED',generation:1,source:'UNVERIFIED_RECEIPT_ACCESS',financialProof:false,accessEnabled:true,
    history:[{id:'event',action:'GRANTED',actorId:'synthetic-buyer',reason:'Cấp quyền thử nghiệm từ chứng từ',createdAt:'2026-10-23T08:00:00Z',generation:{generation:1}}]};
  const claim={id:'claim',orderId:'receipt-order',requestId:'request',status:'MATCHED_CLAIM',financialProof:false,
    fields:{bankBin:'970422',accountNumber:'0000000000',beneficiaryName:'EDUAI SANDBOX',amountMinor:'200000',transferContent:'EDU-SYNTHETIC',occurredAt:'2026-10-23T08:00:00Z',transactionId:'SYNTHETIC-TXN'},
    warnings:['CUSTOMER_IMAGE_NOT_BANK_PROOF'],confidence:95,createdAt:'2026-10-23T08:00:00Z',assessedAt:'2026-10-23T08:00:01Z',expiresAt:'2099-01-01',imageAvailable:true,
    order:{id:'receipt-order',orderNumber:'EDU-THU-NGHIEM',status:'pending_payment',payableAmountMinor:'200000',currency:'VND',buyer:user,lines:[{productType:kind,displayTitle:kind==='membership'?'Hội viên thử nghiệm':'Khóa học thử nghiệm'}]}};
  const payment={orderId:'receipt-order',orderNumber:'EDU-THU-NGHIEM',orderStatus:'PENDING_PAYMENT',paymentRequired:true,
    payment:{id:'attempt',provider:'bank_transfer',status:'PENDING',amount:{amountMinor:'200000',currency:'VND'},expiresAt:'2099-01-01',receiptReviewEnabled:true,receiptUploadEnabled:true,
      qrCodeDataUrl:'data:image/png;base64,'+png.toString('base64'),bankTransfer:{bankName:'MB SANDBOX',bankBin:'970422',accountNumber:'0000000000',beneficiaryName:'EDUAI SANDBOX',transferContent:'EDU-SYNTHETIC'}}};
  const order={id:'receipt-order',orderNumber:'EDU-THU-NGHIEM',status:'PENDING_PAYMENT',fulfillmentStatus:'NOT_STARTED',subtotal:payment.payment.amount,discount:{amountMinor:'0',currency:'VND'},payable:payment.payment.amount,paymentRequired:true,
    lines:[{id:'line',productType:kind.toUpperCase(),productReferenceId:'synthetic-product',title:claim.order.lines[0].displayTitle,quantity:1,unitListPrice:payment.payment.amount,finalPrice:payment.payment.amount}],payment:{...payment.payment,createdAt:'2026-10-23'},createdAt:'2026-10-23',updatedAt:'2026-10-23',confirmedAt:null,cancelledAt:null,expiredAt:null};
  const bank={request:{id:'request',status:'UNDER_REVIEW',bankBin:'970422',accountNumber:'0000000000',beneficiaryName:'EDUAI SANDBOX',amountMinor:'200000',transferContent:'EDU-SYNTHETIC',expiresAt:'2099-01-01'},
    statements:withEvidence?[{id:'bank-evidence',recordedById:'admin-source',exceptionReason:null,bankBin:'970422',accountNumber:'0000000000',transactionId:'BANK-SYNTHETIC-TXN',amountMinor:'200000',transferContent:'EDU-SYNTHETIC',occurredAt:'2026-10-23T08:00:00Z',statementReference:'synthetic://trusted-bank-fixture',statementSha256:'a'.repeat(64),recordedAt:'2026-10-23T08:00:00Z'}]:[],
    approvals:[] as Array<{evidenceId:string;actorId:string;approvedAt:string}>,support:[]};
  const writes:Array<{path:string;body:unknown;key:string|undefined}>=[];
  await page.route('**/api/v1/**',async route=>{
    const req=route.request();const path=new URL(req.url()).pathname.replace('/api/v1','');
    const json=(data:unknown)=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,message:'OK',data})});
    if(req.method()==='POST'){
      writes.push({path,body:req.headers()['content-type']?.includes('application/json')?req.postDataJSON():null,key:req.headers()['idempotency-key']});
      if(path==='/admin/commerce/receipt-claims/claim/revoke'){state.state='REVOKED';state.accessEnabled=false;state.history.push({id:'revoke',action:'REVOKED',actorId:'synthetic-admin',reason:req.postDataJSON().reason,createdAt:new Date().toISOString(),generation:{generation:1}});return json(state);}
      if(path==='/admin/commerce/bank-transfers/evidence/bank-evidence/approvals'){bank.approvals.push({evidenceId:'bank-evidence',actorId:'synthetic-admin',approvedAt:new Date().toISOString()});return json({status:'UNDER_REVIEW'});}
      if(path==='/payments/orders/receipt-order/receipts')return json(claim);
      throw new Error('Unexpected synthetic write '+path);
    }
    if(path.endsWith('/image'))return route.fulfill({contentType:'image/png',body:png});
    if(path==='/notifications/unread-count')return json({unreadCount:0});
    if(path==='/payments/methods')return json({methods:['bank_transfer']});
    if(path==='/commerce/orders/receipt-order')return json(order);
    if(path==='/payments/orders/receipt-order/request')return json(payment);
    if(path==='/payments/orders/receipt-order/receipts')return json({items:[claim]});
    if(path==='/admin/commerce/receipt-claims')return json({items:[claim],page:1,pageSize:20,total:1,totalPages:1});
    if(path==='/admin/commerce/receipt-claims/claim')return json(claim);
    if(path.endsWith('/claim/access'))return json(state);
    if(path==='/admin/commerce/bank-transfers/request')return json(bank);
    return json({items:[]});
  });
  return {writes,state};
}
async function layout(page:Page){
  const dimensions=await page.locator('body').evaluate(body=>({client:body.clientWidth,scroll:body.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client+1);
  for(const button of await page.locator('.receipt-panel button,.receipt-admin button').all())if(await button.isVisible())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
}
for(const width of widths){
  for(const kind of ['course','membership'])test(`receipt ${kind} responsive ${width}`,async({page})=>{
    await install(page,'student',kind);const runtime=guardRuntime(page);await page.setViewportSize({width,height:1000});await page.goto('/orders/receipt-order');
    const panel=page.locator('.receipt-panel');await expect(panel.getByRole('heading',{name:'Kiểm tra ảnh giao dịch'})).toBeVisible();
    await expect(panel.getByRole('img')).toBeVisible();await expect(panel.getByText('Đã mở đầy đủ quyền học — đang chờ đối soát')).toBeVisible();
    const image=await panel.getByRole('img').boundingBox();const result=await panel.getByRole('heading',{name:'Ảnh khớp thông tin đơn'}).boundingBox();expect(result!.y).toBeGreaterThan(image!.y+image!.height);
    expect(await panel.getByRole('img').getAttribute('src')).toMatch(/^blob:/);await layout(page);
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/payw-01b/${kind}-${width}.png`,fullPage:true});
    if(width===390){await panel.getByLabel('Chọn ảnh giao dịch').setInputFiles({name:'synthetic-receipt.png',mimeType:'image/png',buffer:png});await panel.getByRole('button',{name:'Tải ảnh lên'}).click();await expect(panel.getByRole('button',{name:'Tải ảnh lên'})).toBeDisabled();}
    runtime.assertClean();
  });
  test(`Admin receipt responsive ${width}`,async({page})=>{
    await install(page,'platform_admin','membership');const runtime=guardRuntime(page);await page.setViewportSize({width,height:1000});await page.goto('/admin/dashboard/receipt-review');
    await expect(page.getByRole('heading',{name:'Chi tiết chứng từ'})).toBeVisible();await expect(page.locator('.receipt-admin img')).toBeVisible();
    await expect(page.getByRole('button',{name:'Xác nhận đã thanh toán'})).toBeDisabled();await layout(page);
    await page.screenshot({path:`test-results/payw-01b/admin-${width}.png`,fullPage:true});runtime.assertClean();
  });
}
test('Admin confirms exact revocation and keeps financial approval at one of two',async({page})=>{
  const fixture=await install(page,'platform_admin','membership',true);const runtime=guardRuntime(page);await page.goto('/admin/dashboard/receipt-review');
  await page.getByLabel('Lý do thao tác').fill('Đã kiểm tra độc lập chứng cứ ngân hàng');
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Xác nhận đã thanh toán'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Xác nhận thay đổi'}).click();
  await expect(page.getByText('Đã ghi nhận lượt duyệt. Cần hai Admin độc lập; đơn chưa được xác nhận thanh toán.')).toBeVisible();
  expect(fixture.writes[0].body).toMatchObject({source:'BANK_STATEMENT_CHECKED',transactionId:'BANK-SYNTHETIC-TXN',statementSha256:'a'.repeat(64)});
  await page.getByLabel('Lý do thao tác').fill('Kiểm tra quyền cần thu hồi theo đúng đơn');await page.getByRole('button',{name:'Thu hồi quyền truy cập'}).click();
  expect(fixture.writes).toHaveLength(1);await page.getByRole('dialog').getByRole('button',{name:'Xác nhận thay đổi'}).click();
  await expect(page.getByText('Quyền từ đơn này đã được thu hồi. Quyền mua hợp lệ từ nguồn khác được giữ nguyên.')).toBeVisible();
  expect(fixture.writes[1]).toMatchObject({path:'/admin/commerce/receipt-claims/claim/revoke',body:{expectedGeneration:1}});expect(fixture.writes.every(item=>item.key)).toBe(true);runtime.assertClean();
});