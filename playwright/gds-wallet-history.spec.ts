import { expect, test } from '@playwright/test';
const session=JSON.stringify({accessToken:'synthetic-history-token',refreshToken:'',tokenType:'Bearer',expiresIn:3600,user:{id:'history-user',email:'history@example.invalid',fullName:'Người dùng kiểm thử',status:'active',roles:['student'],createdAt:'2026-11-05T00:00:00Z',updatedAt:'2026-11-05T00:00:00Z'}});
for(const width of [320,375,390,412,768,1024,1440])test(`full wallet history and compact overview at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:950});const unexpected:string[]=[];let expectedFailures=0;
  page.on('pageerror',error=>unexpected.push(error.message));
  page.on('console',message=>{if(['error','warning'].includes(message.type())&&!/Failed to load resource:.*503/.test(message.text()))unexpected.push(message.text());});
  page.on('response',response=>{if(response.status()>=400){if(response.status()===503&&response.url().includes('/transactions?')&&response.url().includes('cursor=20'))expectedFailures++;else unexpected.push(response.status()+' '+response.url());}});
  await page.addInitScript(value=>localStorage.setItem('eduai.auth.session.v1',value),session);
  const rows=Array.from({length:45},(_,i)=>({id:`journal-${i}`,type:i%3===0?'CAPTURE':i%3===1?'TOPUP_CREDIT':'RESERVE',amountMinor:String(10000+i),occurredAt:new Date(Date.UTC(2026,10,5,0,0,45-i)).toISOString()}));
  let failNext=true;
  const requested:string[]=[];
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url()); expect(route.request().method()).toBe('GET'); let data:unknown={items:[],unreadCount:0};
    if(url.pathname.endsWith('/wallet/gds'))data={available:true,mode:'production',state:'READY_PRODUCTION',balance:{settledMinor:'60000',availableMinor:'60000',reservedMinor:'0',currency:'VND'},topupEnabled:true,paymentEnabled:true,withdrawalEnabled:true,paymentHeldMinor:'0',withdrawalHeldMinor:'0',totalDepositedMinor:'200000',totalPaidMinor:'130000',totalWithdrawnMinor:'10000',debtMinor:'0',income:null,recentTransactions:[]};
    else if(url.pathname.endsWith('/withdrawal-settings'))data={minimumMinor:'10000',maximumMinor:'10000000',version:1,admissionEnabled:true,processingEnabled:true};
    else if(url.pathname.endsWith('/transactions')){
      const filter=url.searchParams.get('filter');const start=Number(url.searchParams.get('cursor')??0); requested.push(`${filter}:${start}`);
      if(start===20&&failNext){failNext=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:{code:'UNAVAILABLE',message:'Temporary test error'}})});}
      const filtered=rows.filter(row=>filter==='incoming'?row.type==='TOPUP_CREDIT':filter==='outgoing'||filter==='payments'?row.type==='CAPTURE':filter==='withdrawals'?false:true);
      data={items:filtered.slice(start,start+20),hasMore:start+20<filtered.length,nextCursor:start+20<filtered.length?String(start+20):null};
    }else if(url.pathname.endsWith('/tmi/wallet'))data={current:12,earned:12,spent:0,expired:0};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
  });
  await page.goto('/wallet/gds');
  await expect(page.getByText('60.000 ₫',{exact:true})).toBeVisible();
  await expect(page.getByText('Tổng số dư',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Lịch sử',exact:true})).toHaveCount(0);
  await expect(page.getByText('Đang giữ cho thanh toán',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Đang chờ rút',{exact:true})).toHaveCount(0);
  await expect(page.locator('.gds-wallet-totals dd')).toHaveText(['200.000 ₫','130.000 ₫','10.000 ₫']);
  const list=page.locator('.gds-history-list');await expect(list.getByRole('listitem')).toHaveCount(20);
  await page.getByRole('button',{name:'Xem thêm giao dịch'}).click();await expect(page.getByRole('alert')).toContainText('Chưa tải được giao dịch tiếp theo');
  await expect(list.getByRole('listitem')).toHaveCount(20);
  await page.getByRole('button',{name:'Xem thêm giao dịch'}).press('Enter');await expect(list.getByRole('listitem')).toHaveCount(40);
  await page.getByRole('button',{name:'Xem thêm giao dịch'}).click();await expect(list.getByRole('listitem')).toHaveCount(45);
  for(const filter of ['Tiền vào','Tiền ra','Thanh toán']){await page.getByRole('button',{name:`Lọc: ${filter}`}).click();await expect(list.getByRole('listitem')).toHaveCount(15);}
  await page.getByRole('button',{name:'Lọc: Rút tiền'}).click();await expect(page.getByText('Chưa có giao dịch phù hợp.')).toBeVisible();
  expect(requested.filter(value=>value==='all:20')).toHaveLength(2);
  await page.getByRole('button',{name:'Lọc: Tất cả'}).click();await expect(list.getByRole('listitem')).toHaveCount(20);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.reload();await expect(list.getByRole('listitem')).toHaveCount(20);
  await page.screenshot({path:test.info().outputPath(`wallet-compact-${width}.png`),fullPage:true});
  expect(expectedFailures).toBe(1);expect(unexpected).toEqual([]);
});
