import React, {useEffect, useState, useRef} from 'react';
import {Annotator} from 'image-labeler-react';

async function postData(url = ``, data = {}) {
    console.log("Post data = ", data);
    return fetch(url, {
        method: "POST", 
        mode: "cors", 
        cache: "no-cache", 
        credentials: "same-origin", 
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow", 
        referrer: "no-referrer", 
        body: JSON.stringify(data), 
    }).then(response => response.json()); // parses response to JSON
}


const types = [
  'A',
  'B',
  'Cylinder'
]

const serverUrl = 'http://localhost:3001/';

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageNum, setImageNum] = useState(0);
  const [defaultType, setDefaultType] = useState('');
  const [defaultBoxes, setDefaultBoxes] = useState([]);
  const [[width, height], setWidthHeight] = useState([600, 600]);
  const mainRef = useRef(null);
  const showNextImage = () => {
    return fetch(serverUrl).then(async res=>{
      let body = await res.json();
      let url = body.url;
      const _defaultType = body.defaultType;
      const _defaultBoxes = body.defaultBoxes;
      setDefaultType(_defaultType);
      setDefaultBoxes(_defaultBoxes);
      if (!url){
        setImageUrl('');
        return;
      }

      url = serverUrl + url;
      setImageUrl(url);
    })
  }
  const getImageNum = () => {
    return fetch(serverUrl + 'image-num').then(async res=>{
      let num = await res.text();
      setImageNum(parseInt(num));
    })
  }

  const onResize = () => {
    if (mainRef.current == null){
      return;
    }

    // @ts-ignore
    const w = mainRef.current.clientWidth;
    // @ts-ignore
    const h = mainRef.current.clientHeight;
    setWidthHeight([w - 36, h - 120]);
  }

  useEffect(()=>{
    showNextImage();
    getImageNum();
    onResize();
    window.addEventListener('resize', onResize);
    return window.removeEventListener('resize', onResize);
  }, []); 

  return (
    <div className="App" ref={mainRef} style={{
      width: '95vw',
      height: '95vh',
      minWidth: 300,
      minHeight: 500,
      maxWidth: 1200,
      maxHeight: 2000,
      padding: 18,
      position: 'relative',
      margin: '10px auto',
      backgroundColor: '#aae', 
      borderRadius: 5,

      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignContent: 'center',
    }}>
      <label style={{marginLeft: 8}}>Left Num: {imageNum}</label>
      <Annotator 
        height={height} 
        width={width} 
        imageUrl={imageUrl} 
        asyncUpload={async (labeledData)=>{
          postData(serverUrl, labeledData).then(res => {
            getImageNum();
            showNextImage();
          });
        }} 
        types={types} 
        defaultType={defaultType}
        defaultBoxes={defaultBoxes}
        style={{
          margin: '0px auto',
          borderRadius: 5
        }}/>
    </div>
  );
}

export default App;
