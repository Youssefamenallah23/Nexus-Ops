import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage(); await page.setViewport({width:375,height:812}); await page.goto('http://127.0.0.1:3000',{waitUntil:'networkidle0'});
 console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('#live-simulator *')].map(e=>({tag:e.tagName,class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,65)})).filter(e=>e.right>376||e.left<0).slice(0,18)),null,2));
} finally {await browser.close();}
