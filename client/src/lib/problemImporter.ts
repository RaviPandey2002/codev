import type { ProblemData } from '@codev/shared';

/**
 * Safely encodes ProblemData into a UTF-8 Base64 string for URL hash transmission.
 */
export function encodeProblemData(problem: ProblemData): string {
  const json = JSON.stringify(problem);
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return btoa(unescape(encodeURIComponent(json)));
}

/**
 * Safely decodes an incoming Base64 problem payload into validated ProblemData.
 */
export function decodeProblemData(encoded: string): ProblemData | null {
  try {
    if (!encoded || typeof encoded !== 'string') return null;
    const clean = decodeURIComponent(encoded.trim());
    let json = '';
    if (typeof TextDecoder !== 'undefined') {
      const binary = atob(clean);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = new TextDecoder().decode(bytes);
    } else {
      json = decodeURIComponent(escape(atob(clean)));
    }

    const data = JSON.parse(json);
    if (
      !data ||
      typeof data !== 'object' ||
      typeof data.title !== 'string' ||
      !data.title.trim() ||
      !data.platform
    ) {
      return null;
    }

    return {
      title: data.title.trim(),
      platform: data.platform,
      url: data.url || undefined,
      contestId: typeof data.contestId === 'number' ? data.contestId : undefined,
      index: data.index || undefined,
      timeLimit: data.timeLimit || undefined,
      memoryLimit: data.memoryLimit || undefined,
      difficulty: data.difficulty || undefined,
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      description: data.description || undefined,
      inputSpecification: data.inputSpecification || undefined,
      outputSpecification: data.outputSpecification || undefined,
      sampleInput: data.sampleInput || undefined,
      sampleOutput: data.sampleOutput || undefined,
      sampleCases: Array.isArray(data.sampleCases) ? data.sampleCases : [],
      codeSnippets: Array.isArray(data.codeSnippets) ? data.codeSnippets : undefined,
    };
  } catch (err) {
    console.error('Failed to decode problem data:', err);
    return null;
  }
}

/**
 * Generates the executable `javascript:...` bookmarklet string.
 * Users drag this link to their browser bookmarks bar.
 */
export function generateBookmarkletScript(targetRoomId?: string, origin?: string): string {
  const safeOrigin = (origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')).replace(/\/$/, '');
  const safeRoomId = targetRoomId ? targetRoomId.trim() : '';

  // Minified, robust Codeforces DOM scraper
  return `javascript:(function(){try{var p=document.querySelector('.problem-statement');if(!p){alert('Codev Bookmarklet: No Codeforces problem statement found on this page. Please open a Codeforces problem page (e.g. codeforces.com/contest/.../problem/...).');return;}var titleEl=p.querySelector('.header .title');var title=titleEl?titleEl.innerText.trim():document.title;var timeLimitEl=p.querySelector('.header .time-limit');var timeLimit=timeLimitEl?timeLimitEl.innerText.replace(/^time limit per test\\s*/i,'').trim():'2.0 seconds';var memoryLimitEl=p.querySelector('.header .memory-limit');var memoryLimit=memoryLimitEl?memoryLimitEl.innerText.replace(/^memory limit per test\\s*/i,'').trim():'256 megabytes';var bodyClone=p.cloneNode(true);var h=bodyClone.querySelector('.header');if(h)h.remove();var s=bodyClone.querySelector('.sample-tests');if(s)s.remove();var desc=bodyClone.innerHTML;var sampleCases=[];var sampleTest=p.querySelector('.sample-test');if(sampleTest){var inputs=sampleTest.querySelectorAll('.input pre');var outputs=sampleTest.querySelectorAll('.output pre');for(var i=0;i<inputs.length;i++){var rawIn='';var lines=inputs[i].querySelectorAll('.test-example-line');if(lines&&lines.length>0){var arr=[];for(var j=0;j<lines.length;j++)arr.push(lines[j].innerText);rawIn=arr.join('\\n');}else{rawIn=inputs[i].innerText;}var rawOut=outputs[i]?outputs[i].innerText:'';sampleCases.push({id:String(i+1),name:'Case '+(i+1),input:rawIn.trim(),output:rawOut.trim()});}}var prob={title:title,platform:'CODEFORCES',url:window.location.href,timeLimit:timeLimit,memoryLimit:memoryLimit,description:desc,sampleCases:sampleCases,sampleInput:sampleCases[0]?sampleCases[0].input:'',sampleOutput:sampleCases[0]?sampleCases[0].output:''};var json=JSON.stringify(prob);var utf8=encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,function(m,p1){return String.fromCharCode('0x'+p1);});var encoded=btoa(utf8);var targetOrigin='${safeOrigin}';var targetRoom='${safeRoomId}';if(!targetRoom){var last=localStorage.getItem('codev_last_room')||'';var promptRoom=prompt('Enter your Codev Room ID or Room URL:',last);if(!promptRoom)return;targetRoom=promptRoom.replace(/^https?:\\/\\/[^\\/]+\\/rooms?\\//,'').replace(/^[#?]/,'').trim();if(targetRoom)localStorage.setItem('codev_last_room',targetRoom);}if(!targetRoom){alert('Codev Room ID is required.');return;}var targetUrl=targetOrigin+'/rooms/'+encodeURIComponent(targetRoom)+'#addProblem='+encoded;window.open(targetUrl,'codev_workspace');}catch(e){alert('Codev Bookmarklet Error: '+e.message);}})();`;
}

/**
 * Built-in mock Codeforces problem for in-app simulation and testing.
 */
export const SAMPLE_SIMULATED_CF_PROBLEM: ProblemData = {
  title: '2290H. Dijkstra and the Enchanted Forest',
  platform: 'CODEFORCES',
  url: 'https://codeforces.com/contest/2290/problem/H',
  timeLimit: '2.0 seconds',
  memoryLimit: '256 megabytes',
  difficulty: '1800',
  tags: ['graphs', 'shortest paths', 'greedy', 'dijkstra'],
  description: `<div><p>Polycarp is navigating an enchanted weighted undirected graph with $n$ vertices and $m$ edges ($1 \\le n \\le 10^5$, $1 \\le m \\le 2 \\cdot 10^5$). Each edge has a base weight $w_i$.</p><p>However, an enchantment modifies the path cost based on the number of unique colors crossed. Determine the shortest path from vertex $1$ to vertex $n$, or print <code>-1</code> if no path exists.</p></div>`,
  sampleCases: [
    {
      input: '5 6\n1 2 2\n2 5 5\n2 3 4\n1 4 1\n4 3 3\n3 5 1',
      output: '5',
    },
    {
      input: '3 2\n1 2 10\n2 3 20',
      output: '30',
    },
    {
      input: '2 0',
      output: '-1',
    },
  ],
  sampleInput: '5 6\n1 2 2\n2 5 5\n2 3 4\n1 4 1\n4 3 3\n3 5 1',
  sampleOutput: '5',
};
