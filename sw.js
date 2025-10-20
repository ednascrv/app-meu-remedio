<script type="module">
window.addEventListener('DOMContentLoaded', () => {

// === Código começa aqui ===
import { LocalNotifications } from '@capacitor/local-notifications';
const LS_KEY='meu_remedio', LS_HIST='meu_remedio_hist_avancado';
let remedios=JSON.parse(localStorage.getItem(LS_KEY)||'[]');
let historico=JSON.parse(localStorage.getItem(LS_HIST)||'[]');

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function salvarTudo(){ localStorage.setItem(LS_KEY,JSON.stringify(remedios)); localStorage.setItem(LS_HIST,JSON.stringify(historico)); renderTabela(); renderHistorico(); }
function speak(text){ if(!text) return; if('speechSynthesis' in window){ const u=new SpeechSynthesisUtterance(text); u.lang='pt-BR'; speechSynthesis.speak(u); } }
function playAlertSound(){ document.getElementById('alertSound').currentTime=0; document.getElementById('alertSound').play().catch(()=>{}); }
function nowBrasilia(){ const now=new Date(); const utc=now.getTime()+now.getTimezoneOffset()*60000; return new Date(utc+(-3*3600000)); }

function gerarHorariosAutomaticos(instrucao,horaInicial="08:00",maxQtd=24){
  const regex=/a cada (\d{1,2}) horas?/i;
  const match=instrucao.match(regex);
  const intervalo = match ? parseInt(match[1]) : null;
  if(!intervalo) return [];
  const [hh,mm]=horaInicial.split(':').map(Number);
  let horarios=[]; let current=new Date(); current.setHours(hh,mm,0,0);
  for(let i=0;i<maxQtd;i++){ horarios.push(current.toTimeString().slice(0,5)); current.setHours(current.getHours()+intervalo); if(current.getDate()!==new Date().getDate()) break;}
  return horarios;
}

async function agendarRemedio(remedio){
  let horarios = remedio.horarios.length>0 ? remedio.horarios : gerarHorariosAutomaticos(remedio.instrucao, remedio.horaInicial||"08:00");
  horarios.forEach(hhmm=>{
    const [hh,mm]=hhmm.split(':').map(Number);
    let proximo = nowBrasilia(); proximo.setHours(hh,mm,0,0);
    if(proximo<=nowBrasilia()) proximo.setDate(proximo.getDate()+1);
    const delay = proximo - nowBrasilia();
    setTimeout(async ()=>{
      const msg=`${remedio.paciente||'Paciente'} tomar ${remedio.nome} agora.`;
      speak(msg); playAlertSound();
      await LocalNotifications.schedule({notifications:[{title: msg, body:'Horário do medicamento', id: new Date().getTime(), schedule:{at: new Date()}, sound:'alert.mp3', smallIcon:'icon', channelId:'meds'}]});
      historico.unshift({id:uid(), paciente:remedio.paciente, nome:remedio.nome, horario:hhmm, data:new Date().toLocaleString()});
      salvarTudo(); agendarRemedio(remedio);
    }, delay);
  });
}

function renderTabela(){
  const tbody=document.querySelector('#tblRemedios tbody'); tbody.innerHTML='';
  remedios.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${r.foto?`<img src="${r.foto}" class="pill-img">`:''}</td>
      <td>${r.paciente||''}</td>
      <td>${r.nome||''}</td>
      <td>${(r.horarios||[]).join(', ')}</td>
      <td><button class="btn-small green" onclick="tomou('${r.id}')">Tomou</button>
      <button class="btn-small red" onclick="remover('${r.id}')">Remover</button></td>`;
    tbody.appendChild(tr);
  });
}

function renderHistorico(){
  const div=document.getElementById('historyList'); div.innerHTML='';
  historico.forEach(h=>{
    const el=document.createElement('div'); el.className='history-item';
    el.textContent=`${h.data}: ${h.paciente} tomou ${h.nome} (${h.horario})`;
    div.appendChild(el);
  });
}

window.tomou=function(id){
  const r=remedios.find(x=>x.id===id);
  if(!r) return;
  historico.unshift({id:uid(), paciente:r.paciente, nome:r.nome, horario:nowBrasilia().toTimeString().slice(0,5), data:new Date().toLocaleString()});
  salvarTudo();
  alert(`${r.paciente} tomou ${r.nome}`);
}

window.remover=function(id){
  remedios=remedios.filter(x=>x.id!==id); salvarTudo();
}

document.getElementById('btnManual').addEventListener('click',()=>document.getElementById('modalForm').classList.add('open'));
document.getElementById('btnCancelar').addEventListener('click',()=>document.getElementById('modalForm').classList.remove('open'));
document.getElementById('btnSalvar').addEventListener('click',()=>{
  const paciente=document.getElementById('inputPaciente').value.trim();
  const nome=document.getElementById('inputNome').value.trim();
  const instrucao=document.getElementById('inputInstrucao').value.trim();
  const horaInicial=document.getElementById('inputHora').value;
  const fotoInput=document.getElementById('inputFoto');
  if(!nome) return alert('Preencha o nome do medicamento.');
  const reader=new FileReader();
  reader.onload=function(e){
    const novo={id:uid(), paciente,nome,instrucao,horaInicial,foto:e.target.result, horarios:[]};
    remedios.push(novo);
    salvarTudo(); agendarRemedio(novo);
    document.getElementById('modalForm').classList.remove('open');
  };
  if(fotoInput.files[0]) reader.readAsDataURL(fotoInput.files[0]);
  else reader.onload({target:{result:''}});
});

document.getElementById('btnLimparHistorico').addEventListener('click',()=>{ historico=[]; salvarTudo(); });
document.getElementById('btnExport').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify(remedios,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='remedios.json'; a.click(); URL.revokeObjectURL(url); });
document.getElementById('btnImport').addEventListener('click',()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json'; inp.onchange=e=>{
  const file=e.target.files[0]; const reader=new FileReader(); reader.onload=ev=>{ try{ const data=JSON.parse(ev.target.result); if(Array.isArray(data)){remedios=data; salvarTudo(); data.forEach(r=>agendarRemedio(r)); } }catch(err){alert('Arquivo inválido');} }; reader.readAsText(file); }; inp.click(); });

document.getElementById('btnAlarm').addEventListener('click',()=>{ window.location.href='intent://#Intent;action=android.intent.action.SET_ALARM;end'; });

document.getElementById('btnVoz').addEventListener('click',()=>{
  if(!('webkitSpeechRecognition' in window)) return alert('Seu navegador não suporta comando de voz.');
  const recognition=new webkitSpeechRecognition();
  recognition.lang='pt-BR'; recognition.interimResults=false;
  recognition.onresult=(e)=>{ const texto=e.results[0][0].transcript; alert('Você disse: '+texto); };
  recognition.start();
});

document.getElementById('btnAdd').addEventListener('click',()=>document.getElementById('inpFotoOCR').click());
document.getElementById('inpFotoOCR').addEventListener('change', async (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const { data:{ text } } = await Tesseract.recognize(file,'por'); alert('Texto extraído:\n'+text);
});

remedios.forEach(r=>agendarRemedio(r));
renderTabela(); renderHistorico();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js')
    .then(()=>console.log('SW registrado'))
    .catch(e=>console.log(e));
}
// === Código termina aqui ===

});
</script>


