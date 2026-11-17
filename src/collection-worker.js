import {runCollection} from './run-collection.js';
window.collectionProgress={state:'ready'};
const progress=document.querySelector('#progress');
window.startCollection=async options=>{
 const controller=new AbortController();window.stopCollection=()=>controller.abort();
 document.querySelector('#stop').onclick=window.stopCollection;
 try{const result=await runCollection({...options,signal:controller.signal,onProgress:value=>{window.collectionProgress=value;progress.textContent=JSON.stringify(value,null,2);}});window.collectionProgress=result;progress.textContent=JSON.stringify(result,null,2);return result;}catch(error){window.collectionProgress={...window.collectionProgress,state:'error',error:error.message};progress.textContent=JSON.stringify(window.collectionProgress,null,2);throw error;}
};
