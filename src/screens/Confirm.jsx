import React, { useEffect, useRef, useState } from "react";
import { db } from "../db";

export function Confirm({ crew, list, vigilantePin, onBack, onDone }){

const videoRef = useRef(null);
const canvasRef = useRef(null);

const [photo,setPhoto] = useState(null);
const [loading,setLoading] = useState(false);

useEffect(()=>{

async function startCamera(){

try{

const stream = await navigator.mediaDevices.getUserMedia({
video:{ facingMode:"environment" }
});

if(videoRef.current){
videoRef.current.srcObject = stream;
}

}catch(err){

alert("Não foi possível acessar a câmera");

}

}

startCamera();

return ()=>{

if(videoRef.current && videoRef.current.srcObject){
videoRef.current.srcObject.getTracks().forEach(t=>t.stop());
}

};

},[]);


function takePhoto(){

const video = videoRef.current;
const canvas = canvasRef.current;

const ctx = canvas.getContext("2d");

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

ctx.drawImage(video,0,0);

const data = canvas.toDataURL("image/jpeg",0.8);

setPhoto(data);

}


async function confirmar(){

if(!photo){
alert("Tire a foto do tripulante");
return;
}

setLoading(true);

const now = new Date();

const dataIso = now.toISOString().slice(0,10);

const hora =
String(now.getHours()).padStart(2,"0")+":"+
String(now.getMinutes()).padStart(2,"0");

await db.checkins.add({

nome: crew.nome,
documento: crew.documento,
empresa: crew.empresa,
embarcacao: list.embarcacao,

funcao: crew.funcao,
motivacao: crew.motivacao,

acesso: crew.acesso,
transporte: crew.transporte,
tipoTransporte: crew.tipoTransporte,
placa: crew.placa,

observacao: crew.observacao,
controle: crew.controle,

horaSaida: crew.horaSaida,
horaEntrada: crew.horaEntrada,

tipo: list.tipo,
dataIso,
hora,

photoUrl: photo,

vigilantePin,

listId: list.id,

syncStatus:"LOCAL"

});

await db.crew.update(crew.id,{
status:"CONFIRMADO",
confirmedAt:new Date().toISOString()
});

setLoading(false);

onDone();

}

return(

<div className="container">

<div className="card">

<button className="btn" onClick={onBack}>
← Voltar
</button>

<div className="hr"></div>

<div style={{fontWeight:900,fontSize:16}}>
Confirmar Tripulante
</div>

<div className="small">
Confira os dados antes de registrar
</div>

<div className="hr"></div>

<div className="kv">

<div className="k">Nome</div>
<div className="v">{crew.nome}</div>

<div className="k">Documento</div>
<div className="v">{crew.documento}</div>

<div className="k">Empresa</div>
<div className="v">{crew.empresa}</div>

<div className="k">Função</div>
<div className="v">{crew.funcao || "-"}</div>

<div className="k">Embarcação</div>
<div className="v">{list.embarcacao}</div>

<div className="k">Motivação</div>
<div className="v">{crew.motivacao || list.tipo}</div>

<div className="k">Acesso</div>
<div className="v">{crew.acesso || "-"}</div>

<div className="k">Transporte</div>
<div className="v">
{crew.transporte || "-"}
{crew.tipoTransporte ? ` • ${crew.tipoTransporte}` : ""}
</div>

<div className="k">Placa</div>
<div className="v">{crew.placa || "-"}</div>

<div className="k">Controle</div>
<div className="v">{crew.controle || "-"}</div>

<div className="k">Saída</div>
<div className="v">{crew.horaSaida || "-"}</div>

<div className="k">Entrada</div>
<div className="v">{crew.horaEntrada || "-"}</div>

{crew.observacao && (
<>
<div className="k">Observação</div>
<div className="v">{crew.observacao}</div>
</>
)}

</div>

<div className="hr"></div>

<div className="label">
Foto do tripulante
</div>

{!photo && (

<div>

<div className="photoBox">
<video
ref={videoRef}
autoPlay
playsInline
style={{width:"100%"}}
/>
</div>

<button
className="btn primary"
style={{marginTop:10}}
onClick={takePhoto}
>

📸 Tirar Foto

</button>

</div>

)}

{photo && (

<div>

<div className="photoBox">
<img src={photo}/>
</div>

<button
className="btn"
style={{marginTop:10}}
onClick={()=>setPhoto(null)}
>

Refazer Foto

</button>

</div>

)}

<canvas ref={canvasRef} style={{display:"none"}}/>

<div className="hr"></div>

<button
className="btn primary"
disabled={loading}
onClick={confirmar}
>

{loading ? "Salvando..." : "Confirmar Registro"}

</button>

</div>

</div>

)

}