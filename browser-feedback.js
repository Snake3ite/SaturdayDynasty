// Browser-only feedback / bug report widget.
// Uses FormSubmit to email reports (including an optional screenshot) without exposing secrets.
(()=>{
  if(window.SDF_FEEDBACK)return;

  const RECIPIENT='dynastysportsstudio@gmail.com';
  const MAX_FILE_BYTES=10*1024*1024;
  const SESSION_KEY='SDF_SUPABASE_SESSION';

  const css=`
#sdfFeedbackBtn{position:fixed;right:14px;bottom:16px;z-index:8000;display:flex;align-items:center;gap:7px;border:1px solid #f2c94c66;border-radius:999px;background:linear-gradient(135deg,#2b2410,#111d27);color:#fff7d6;padding:10px 14px;box-shadow:0 12px 34px #0005;cursor:pointer;font:800 11px/1 system-ui;letter-spacing:.03em}
#sdfFeedbackBtn:hover{transform:translateY(-1px);border-color:#f2c94caa}
#sdfFeedback{position:fixed;inset:0;z-index:22000;display:none;align-items:center;justify-content:center;padding:18px;background:#01080dd1;backdrop-filter:blur(7px)}
#sdfFeedback.open{display:flex}
#sdfFeedbackBox{width:min(620px,96vw);max-height:92vh;overflow:auto;border:1px solid #29495a;border-radius:14px;background:#071722;color:#eef9ff;box-shadow:0 28px 90px #000a;font-family:system-ui}
.sdfFbHead{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px 14px;border-bottom:1px solid #ffffff14}
.sdfFbHead h2{margin:3px 0 4px;font-size:22px}.sdfFbEy{color:#f2c94c;font-size:9px;font-weight:900;letter-spacing:.16em}.sdfFbSub{margin:0;color:#8fa7b5;font-size:11px;line-height:1.45}
.sdfFbClose{flex:0 0 auto;width:36px;height:36px;border:0;border-radius:7px;background:#102735;color:#dceef7;cursor:pointer;font-size:20px}
#sdfFeedbackForm{display:grid;gap:12px;padding:18px 22px 22px}.sdfFbGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sdfFbField{display:grid;gap:6px}
.sdfFbField>span{color:#a9bec9;font-size:10px;font-weight:800;letter-spacing:.03em}.sdfFbField input,.sdfFbField select,.sdfFbField textarea{width:100%;box-sizing:border-box;border:1px solid #27485a;border-radius:8px;background:#091d29;color:#eef9ff;padding:10px 11px;outline:none;font:12px/1.4 system-ui}
.sdfFbField input:focus,.sdfFbField select:focus,.sdfFbField textarea:focus{border-color:#4d91b1}.sdfFbField textarea{min-height:150px;resize:vertical}.sdfFbFile{border:1px dashed #34586c;border-radius:8px;background:#0a1b26;padding:12px}.sdfFbHint{color:#78919f;font-size:9px;line-height:1.4}
#sdfFbStatus{display:none;padding:10px 11px;border:1px solid #29495a;border-radius:8px;background:#0a1d29;color:#a9c1ce;font-size:11px}#sdfFbStatus.show{display:block}#sdfFbStatus.good{border-color:#286b58;color:#79e6c8}#sdfFbStatus.bad{border-color:#7b3541;color:#ff9cac}
.sdfFbActions{display:flex;justify-content:flex-end;gap:8px}.sdfFbCancel,.sdfFbSend{min-height:40px;border:0;border-radius:8px;padding:0 15px;cursor:pointer;font:900 10px/1 system-ui;letter-spacing:.05em}.sdfFbCancel{background:#102735;color:#cce0ea}.sdfFbSend{background:#b8922f;color:#081014}.sdfFbSend:disabled{opacity:.55;cursor:wait}
.sdfFbHoney{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important}
@media(max-width:760px){#sdfFeedbackBtn{right:12px;bottom:64px;padding:10px 12px}#sdfFeedback{padding:8px}#sdfFeedbackBox{max-height:95vh}.sdfFbHead{padding:16px}#sdfFeedbackForm{padding:14px 16px 18px}.sdfFbGrid{grid-template-columns:1fr}}
`;

  function accountEmail(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')?.user?.email||''}catch{return ''}}
  function setStatus(text,type=''){const x=document.querySelector('#sdfFbStatus');if(!x)return;x.textContent=text;x.className='show'+(type?` ${type}`:'')}
  function close(){document.querySelector('#sdfFeedback')?.classList.remove('open')}

  function make(){
    if(document.querySelector('#sdfFeedback'))return;
    const style=document.createElement('style');style.id='sdf-feedback-style';style.textContent=css;document.head.appendChild(style);

    const btn=document.createElement('button');
    btn.id='sdfFeedbackBtn';btn.type='button';btn.setAttribute('aria-label','Send feedback or report a bug');
    btn.innerHTML='<span aria-hidden="true">🐞</span><span>FEEDBACK</span>';btn.onclick=open;document.body.appendChild(btn);

    const frame=document.createElement('iframe');frame.name='sdfFeedbackTarget';frame.title='Feedback submission target';frame.hidden=true;document.body.appendChild(frame);

    const modal=document.createElement('div');modal.id='sdfFeedback';
    modal.innerHTML=`
      <section id="sdfFeedbackBox" role="dialog" aria-modal="true" aria-labelledby="sdfFeedbackTitle">
        <header class="sdfFbHead"><div><div class="sdfFbEy">SATURDAY DYNASTY FOOTBALL</div><h2 id="sdfFeedbackTitle">Send Feedback</h2><p class="sdfFbSub">Report a bug, suggest an improvement, or tell us what happened. A screenshot is optional.</p></div><button class="sdfFbClose" type="button" aria-label="Close">×</button></header>
        <form id="sdfFeedbackForm" method="POST" enctype="multipart/form-data" target="sdfFeedbackTarget">
          <input type="hidden" name="_subject" value="Saturday Dynasty Football — Browser Feedback">
          <input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false"><input type="hidden" name="_url" id="sdfFbUrl"><input type="hidden" name="Page" id="sdfFbPage"><input type="hidden" name="Browser" id="sdfFbBrowser"><input type="hidden" name="Submitted at" id="sdfFbTime"><input class="sdfFbHoney" type="text" name="_honey" tabindex="-1" autocomplete="off">
          <div class="sdfFbGrid">
            <label class="sdfFbField"><span>TYPE</span><select name="Type" required><option value="Bug report">Bug report</option><option value="Suggestion">Suggestion</option><option value="Gameplay feedback">Gameplay feedback</option><option value="Purchase / account issue">Purchase / account issue</option><option value="Other">Other</option></select></label>
            <label class="sdfFbField"><span>YOUR EMAIL (OPTIONAL)</span><input id="sdfFbEmail" type="email" name="email" autocomplete="email" placeholder="So we can reply if needed"></label>
          </div>
          <label class="sdfFbField"><span>WHAT HAPPENED?</span><textarea name="Description" required maxlength="5000" placeholder="Tell us what you were doing, what you expected, and what went wrong."></textarea></label>
          <label class="sdfFbField sdfFbFile"><span>SCREENSHOT (OPTIONAL)</span><input id="sdfFbAttachment" type="file" name="attachment" accept="image/png,image/jpeg,image/webp"><small class="sdfFbHint">PNG, JPG, or WEBP. Maximum 10 MB.</small></label>
          <div id="sdfFbStatus" aria-live="polite"></div><div class="sdfFbActions"><button class="sdfFbCancel" type="button">CANCEL</button><button class="sdfFbSend" type="submit">SEND FEEDBACK</button></div>
        </form>
      </section>`;
    document.body.appendChild(modal);

    const form=modal.querySelector('#sdfFeedbackForm');form.action=`https://formsubmit.co/${RECIPIENT}`;
    modal.querySelector('.sdfFbClose').onclick=close;modal.querySelector('.sdfFbCancel').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};

    const file=form.querySelector('#sdfFbAttachment');
    file.addEventListener('change',()=>{if(file.files?.[0]?.size>MAX_FILE_BYTES){file.value='';setStatus('That screenshot is over 10 MB. Please choose a smaller image.','bad')}else{const status=form.querySelector('#sdfFbStatus');if(status?.classList.contains('bad'))status.className=''}});

    let submitted=false;
    frame.addEventListener('load',()=>{if(!submitted)return;submitted=false;const send=form.querySelector('.sdfFbSend');send.disabled=false;send.textContent='SEND FEEDBACK';setStatus('Feedback sent. Thank you!','good');form.querySelector('textarea[name="Description"]').value='';file.value=''});

    form.addEventListener('submit',e=>{
      const f=file.files?.[0];if(f&&f.size>MAX_FILE_BYTES){e.preventDefault();return setStatus('That screenshot is over 10 MB. Please choose a smaller image.','bad')}
      form.querySelector('#sdfFbUrl').value=location.href;form.querySelector('#sdfFbPage').value=location.href;form.querySelector('#sdfFbBrowser').value=navigator.userAgent;form.querySelector('#sdfFbTime').value=new Date().toISOString();
      const send=form.querySelector('.sdfFbSend');send.disabled=true;send.textContent='SENDING…';setStatus('Sending your feedback…');submitted=true;
      setTimeout(()=>{if(!submitted)return;submitted=false;send.disabled=false;send.textContent='SEND FEEDBACK';setStatus('The report was submitted. If it does not arrive, try again without the screenshot.','good')},8000);
    });

    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
  }

  function open(){make();const modal=document.querySelector('#sdfFeedback');const email=document.querySelector('#sdfFbEmail');if(email&&!email.value)email.value=accountEmail();modal.classList.add('open');setTimeout(()=>modal.querySelector('textarea[name="Description"]')?.focus(),0)}

  const init=()=>make();document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  window.SDF_FEEDBACK={open,close};
})();
