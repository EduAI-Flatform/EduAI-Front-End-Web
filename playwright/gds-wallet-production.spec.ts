import { expect, test } from '@playwright/test';
import { guardRuntime } from './runtime-guards';
for (const width of [320,1440]) {
  for (const enabled of [true,false]) test('production GDS checkout capability '+enabled+' at '+width,async({page})=>{
    await page.setViewportSize({width,height:950});
    await page.addInitScript(()=>localStorage.setItem('eduai.auth.session.v1',JSON.stringify({accessToken:'local-test-only',refreshToken:'',tokenType:'Bearer',expiresIn:3600,user:{id:'test-student',email:'student@example.test',fullName:'Student',status:'active',roles:['student'],createdAt:'2026-11-03T00:00:00Z',updatedAt:'2026-11-03T00:00:00Z'}})));
    const runtime=guardRuntime(page);
    const money={amountMinor:'10000',currency:'VND'};
    let writes=0,paid=false;
    await page.route('**/api/**',route=>{
      const path=new URL(route.request().url()).pathname;
      if(route.request().method()==='POST') {writes++;expect(path).toBe('/api/v1/wallet/gds/orders/test-order/pay');paid=true;}
      const data=path.endsWith('/commerce/orders/test-order')?{id:'test-order',orderNumber:'EDU-PRODUCTION-GDS',status:paid?'CONFIRMED':'PENDING_PAYMENT',fulfillmentStatus:paid?'FULFILLED':'NOT_STARTED',subtotal:money,discount:{...money,amountMinor:'0'},payable:money,paymentRequired:true,lines:[{id:'line',productType:'COURSE',productReferenceId:'course',title:'Production wallet course',quantity:1,unitListPrice:money,finalPrice:money}],payment:null,createdAt:'2026-11-03T00:00:00Z'}
      :path.endsWith('/payments/methods')?{methods:['payos']}
      :path.endsWith('/wallet/gds')?{available:true,mode:'production',state:'READY_PRODUCTION',balance:{settledMinor:'150000',reservedMinor:'0',availableMinor:'150000',currency:'VND'},paymentEnabled:enabled,topupEnabled:false,recentTransactions:[]}
      :path.endsWith('/wallet/gds/orders/test-order/pay')?{orderId:'test-order',status:'CONFIRMED',amountMinor:'10000',currency:'VND'}
      :path.includes('/payments/orders/test-order')?{orderId:'test-order',orderNumber:'EDU-PRODUCTION-GDS',orderStatus:paid?'CONFIRMED':'PENDING_PAYMENT',paymentRequired:true,payment:null}
      :{items:[],unreadCount:0};
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    });
    await page.goto('/orders/test-order');
    await expect(page.getByRole('heading',{name:'EDU-PRODUCTION-GDS'})).toBeVisible();
    const wallet=page.getByRole('radio',{name:/GDS/});
    if(enabled){
      await expect(wallet).toBeEnabled();
      await wallet.check();
      const pay=page.locator('.commerce-checkout-start__actions button').first();
      await expect(pay).toBeEnabled();
      await pay.click();
      await expect.poll(()=>writes).toBe(1);
      await expect(wallet).toHaveCount(0);
    }else{
      await expect(wallet).toBeDisabled();
      await expect(page.getByRole('radio',{name:/PayOS/})).toBeEnabled();
      expect(writes).toBe(0);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await runtime.assertClean();
    await page.screenshot({path:test.info().outputPath('production-checkout-'+enabled+'-'+width+'.png'),fullPage:true});
  });
}
