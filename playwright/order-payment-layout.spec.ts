import { expect, test } from '@playwright/test';
for(const width of [320,768,1440]) test('order payment layout and cancellation '+width,async({page})=>{
 await page.setViewportSize({width,height:950});
 await page.addInitScript(()=>localStorage.setItem('eduai.auth.session.v1',JSON.stringify({accessToken:'local-test-only',refreshToken:'',tokenType:'Bearer',expiresIn:3600,user:{id:'test-student',email:'student@example.test',fullName:'Student',status:'active',roles:['student'],createdAt:'2026-11-03T00:00:00Z',updatedAt:'2026-11-03T00:00:00Z'}})));
 let cancelled=false,writes=0;
 const money={amountMinor:'10000',currency:'VND'};
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(route.request().method()==='POST'){writes++;expect(path).toBe('/api/v1/payments/orders/test-order/cancel');cancelled=true;}
  const data=path.endsWith('/commerce/orders/test-order')?{id:'test-order',orderNumber:'EDU-TEST-ORDER',status:cancelled?'CANCELLED':'PENDING_PAYMENT',fulfillmentStatus:'NOT_STARTED',subtotal:money,discount:{...money,amountMinor:'0'},payable:money,paymentRequired:true,lines:[{id:'line',productType:'COURSE',productReferenceId:'course',title:'UAT course',quantity:1,unitListPrice:money,finalPrice:money}],payment:null,createdAt:'2026-11-03T00:00:00Z'}
  :path.endsWith('/payments/methods')?{methods:['payos']}
  :path.endsWith('/wallet/gds')?{available:false,mode:'disabled',state:'UNAVAILABLE',balance:null,paymentEnabled:false,topupEnabled:false}
  :path.includes('/payments/orders/test-order')?{orderId:'test-order',orderNumber:'EDU-TEST-ORDER',orderStatus:cancelled?'CANCELLED':'PENDING_PAYMENT',paymentRequired:true,payment:null}
  :{items:[],unreadCount:0};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
 });
 await page.goto('/orders/test-order');
 await expect(page.getByRole('heading',{name:'EDU-TEST-ORDER'})).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 const section=page.locator('.commerce-checkout-start');
 expect(await section.evaluate(node=>getComputedStyle(node).flexDirection)).toBe('column');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Hủy đơn',exact:true}).click();
 expect(writes).toBe(0);
 await page.getByRole('button',{name:'Xác nhận hủy đơn'}).click();
 await expect(page.getByText('Đã hủy thanh toán',{exact:true})).toBeVisible();
 await expect(page.getByRole('radio')).toHaveCount(0);
 expect(writes).toBe(1);
});
