(()=>{const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
document.body.classList.add('loading');
// split text
$$('.split,.split-words').forEach(el=>{const walk=n=>{[...n.childNodes].forEach(c=>{if(c.nodeType===3){const f=document.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(t=>{if(/^\s+$/.test(t)||!t){f.append(t);return}const w=document.createElement('span');w.className='w';const i=document.createElement('span');i.textContent=t;w.append(i);f.append(w)});c.replaceWith(f)}else walk(c)})};walk(el)});
const SHOT=/shot/.test(location.search);const hasG=!SHOT&&window.gsap&&window.ScrollTrigger;let lenis;
if(window.Lenis){lenis=new Lenis({duration:1.2,smoothWheel:true});if(hasG){lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(t=>lenis.raf(t*1000));gsap.ticker.lagSmoothing(0)}else{const r=t=>{lenis.raf(t);requestAnimationFrame(r)};requestAnimationFrame(r)}}
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=$(a.getAttribute('href'));if(!t)return;e.preventDefault();document.body.classList.remove('menu-open');lenis?lenis.scrollTo(t,{offset:-60}):t.scrollIntoView({behavior:'smooth'})}));
// loader
let n=SHOT?99:0;const cnt=$('#count'),bar=$('.loader-bar i');const tick=setInterval(()=>{n=Math.min(100,n+Math.ceil(Math.random()*9));cnt.textContent=n;bar.style.width=n+'%';if(n>=100){clearInterval(tick);setTimeout(start,250)}},40);
function start(){$('#loader').classList.add('done');if(SHOT){document.head.insertAdjacentHTML('beforeend','<style>section{padding:140px 4vw!important}.hero{padding:0!important}</style>');$('#loader').style.display='none';document.querySelectorAll('.hero,.cta').forEach(e=>{e.style.height='900px';e.style.minHeight='900px'})}document.body.classList.remove('loading');if(!hasG){$$('.reveal').forEach(e=>e.style.cssText='opacity:1;transform:none');$$('.split .w>span').forEach(e=>e.style.transform='none');$$('.split-words .w>span').forEach(e=>e.style.opacity=1);return}
gsap.to('.hero-img',{scale:1,duration:2.2,ease:'expo.out'});gsap.to('.hero h1 .w>span',{y:0,duration:1.4,stagger:.08,ease:'expo.out',delay:.3});
gsap.to('.hero .reveal',{opacity:1,y:0,duration:1.2,stagger:.15,delay:.6,ease:'expo.out'});
$$('.split').forEach(el=>{if(el.closest('.hero'))return;gsap.to(el.querySelectorAll('.w>span'),{y:0,duration:1.2,stagger:.06,ease:'expo.out',scrollTrigger:{trigger:el,start:'top 85%'}})});
$$('.reveal').forEach(el=>{if(el.closest('.hero'))return;gsap.to(el,{opacity:1,y:0,duration:1.2,ease:'expo.out',scrollTrigger:{trigger:el,start:'top 88%'}})});
gsap.to('.split-words .w>span',{opacity:1,stagger:.05,ease:'none',scrollTrigger:{trigger:'.intro',start:'top 75%',end:'bottom 45%',scrub:true}});
$$('[data-speed]').forEach(el=>gsap.to(el,{yPercent:+el.dataset.speed*40,ease:'none',scrollTrigger:{trigger:el.parentElement,start:'top top',end:'bottom top',scrub:true}}));
$$('.ph img').forEach(img=>gsap.fromTo(img,{yPercent:-6,scale:1.12},{yPercent:6,ease:'none',scrollTrigger:{trigger:img,scrub:true}}));
gsap.fromTo('.ftr-big',{xPercent:-8},{xPercent:0,ease:'none',scrollTrigger:{trigger:'.ftr',start:'top bottom',end:'bottom bottom',scrub:true}});
gsap.to('.mq-track',{skewX:0,scrollTrigger:{trigger:'.marquee',onUpdate:s=>gsap.to('.mq-track',{skewX:gsap.utils.clamp(-8,8,s.getVelocity()/-300),duration:.4,overwrite:true})}})}
// header
let last=0;const hdr=$('#hdr');const onS=()=>{const y=window.scrollY;hdr.classList.toggle('scrolled',y>40);hdr.classList.toggle('hide',y>last&&y>300&&!document.body.classList.contains('menu-open'));last=y};addEventListener('scroll',onS,{passive:true});
$('#burger').onclick=()=>document.body.classList.toggle('menu-open');
// cursor
const cur=$('#cursor');let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my;addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
const fl=$('#svcFloat');let fx=0,fy=0;(function loop(){cx+=(mx-cx)*.2;cy+=(my-cy)*.2;cur.style.left=cx+'px';cur.style.top=cy+'px';fx+=(mx-fx)*.12;fy+=(my-fy)*.12;fl.style.left=fx+'px';fl.style.top=fy+'px';requestAnimationFrame(loop)})();
$$('a,button,input,textarea').forEach(el=>{el.addEventListener('mouseenter',()=>cur.classList.add('hover'));el.addEventListener('mouseleave',()=>cur.classList.remove('hover'))});
// service hover image
$$('.svc').forEach(s=>{s.addEventListener('mouseenter',()=>{fl.querySelector('img').src=s.dataset.img;fl.classList.add('on')});s.addEventListener('mouseleave',()=>fl.classList.remove('on'))});
// magnetic buttons
$$('.btn,.arrows button').forEach(b=>{b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.2}px,${(e.clientY-r.top-r.height/2)*.3}px)`});b.addEventListener('mouseleave',()=>b.style.transform='')});
// drag slider
const sl=$('#slider'),tr=$('#track'),pg=$('#prog');let x=0,tx=0,down=false,sx=0,st=0;const max=()=>Math.max(0,tr.scrollWidth-sl.clientWidth);
const clamp=v=>Math.min(0,Math.max(-max(),v));
sl.addEventListener('pointerdown',e=>{down=true;sx=e.clientX;st=tx;sl.setPointerCapture(e.pointerId);sl.style.cursor='grabbing'});
sl.addEventListener('pointermove',e=>{if(down)tx=clamp(st+(e.clientX-sx)*1.3)});
const up=()=>{down=false;sl.style.cursor=''};sl.addEventListener('pointerup',up);sl.addEventListener('pointercancel',up);
sl.addEventListener('mouseenter',()=>cur.classList.add('drag'));sl.addEventListener('mouseleave',()=>cur.classList.remove('drag'));
const step=()=>(tr.children[0].offsetWidth+24);$('#next').onclick=()=>tx=clamp(tx-step());$('#prev').onclick=()=>tx=clamp(tx+step());
(function anim(){x+=(tx-x)*.09;tr.style.transform=`translate3d(${x}px,0,0)`;const m=max();pg.style.width=(20+80*(m?-x/m:0))+'%';requestAnimationFrame(anim)})();
})();
