
import { Course, CourseItem } from '../types';

// Content from courses/output_part_1.txt
const COURSE_1_CONTENT = `我们	wo3'men
他们	ta1'men
没有	mei2'you3
自己	zi4'ji3
中国	zhong1'guo2
可以	ke3'yi3
问题	wen4'ti2
工作	gong1'zuo4
这个	zhe4'ge
生活	sheng1'huo2
这样	zhe4'yang4
已经	yi3'jing
这些	zhe4'xie1
一些	yi1'xie1
起来	qi3'lai2
什么	shen2'me
现在	xian4'zai4
社会	she4'hui4
关系	guan1'xi4
第一	di4'yi1
因为	yin1'wei4
开始	kai1'shi3`;

// Content from courses/output_part_2.txt
const COURSE_2_CONTENT = `不足	bu4'zu2
属于	shu3'yu2
工业	gong1'ye4
音乐	yin1'yue4
满足	man3'zu2
质量	zhi4'liang4
自然	zi4'ran2
抓住	zhua1'zhu4
日子	ri4'zi
期间	qi1'jian1
投资	tou2'zi1
法国	fa3'guo2
过去	guo4'qu4
紧张	jin3'zhang1
比赛	bi3'sai4
阶段	jie1'duan4
开发	kai1'fa1
范围	fan4'wei2
分钟	fen1'zhong1
不知	bu4'zhi1
大会	da4'hui4
总理	zong3'li3
全面	quan2'mian4
未来	wei4'lai2
人口	ren2'kou3
扩大	kuo4'da4
即使	ji2'shi3
军队	jun1'dui4
难以	nan2'yi3
外国	wai4'guo2
先进	xian1'jin4
银行	yin2'hang2
事件	shi4'jian4
热情	re4'qing2
常常	chang2'chang2
强烈	qiang2'lie4
必要	bi4'yao4
文明	wen2'ming2
手段	shou3'duan4
建议	jian4'yi4
女儿	nv3'er2
特殊	te4'shu1
复杂	fu4'za2
战士	zhan4'shi4
作为	zuo4'wei2
形势	xing2'shi4
无论	wu2'lun4
机构	ji1'gou4
执行	zhi2'xing2
讲话	jiang3'hua4
以为	yi3'wei2
同意	tong2'yi4
分子	fen4'zi3
实践	shi2'jian4
科技	ke1'ji4
建筑	jian4'zhu4
之前	zhi1'qian2
广大	guang3'da4
那个	na4'ge
长期	chang2'qi1
专门	zhuan1'men2
大量	da4'liang4
改造	gai3'zao4
民主	min2'zhu3
成绩	cheng2'ji4
父母	fu4'mu3
培养	pei2'yang3
哪里	na3'li
强调	qiang2'diao4
相互	xiang1'hu4
超过	chao1'guo4
正式	zheng4'shi4
著名	zhu4'ming2
批评	pi1'ping2
稳定	wen3'ding4
明白	ming2'bai2
出口	chu1'kou3
重点	zhong4'dian3
资金	zi1'jin1
指导	zhi3'dao3
状态	zhuang4'tai4
祖国	zu3'guo2
不但	bu4'dan4
报道	bao4'dao4
开展	kai1'zhan3
投入	tou2'ru4
高度	gao1'du4
独立	du2'li4
电视	dian4'shi4
妈妈	ma1'ma1
职工	zhi2'gong1
增长	zeng1'zhang3
各地	ge4'di4
有时	you3'shi2
深刻	shen1'ke4
以下	yi3'xia4
刚刚	gang1'gang1
主张	zhu3'zhang1
明确	ming2'que4
习惯	xi2'guan4`;

// Content from courses/output_part_106.txt
const COURSE_106_CONTENT = `道钉	dao4'ding1
等距	deng3'ju4
滴虫	di1'chong2
缔交	di4'jiao1
电键	dian4'jian4
电烫	dian4'tang4
电珠	dian4'zhu1
垫话	dian4'hua4
叮问	ding1'wen4
顶格	ding3'ge2
丢荒	diu1'huang1
冬汛	dong1'xun4
洞晓	dong4'xiao3
笃爱	du3'ai4
笃诚	du3'cheng2
笃志	du3'zhi4
镀层	du4'ceng2
短秤	duan3'cheng4
短袜	duan3'wa4
断垄	duan4'long3
锻制	duan4'zhi4
对比色	dui4'bi3'se4
对译	dui4'yi4
多音字	duo1'yin1'zi4
儿男	er2'nan2
耳软心活	er3'ruan3'xin1'huo2
发懒	fa1'lan3
发刷	fa1'shua1
翻改	fan1'gai3
翻造	fan1'zao4
饭口	fan4'kou3
饭囊	fan4'nang2
费手脚	fei4'shou3'jiao3
分杈	fen1'cha4
分厘	fen1'li2
分式	fen1'shi4
蜂毒	feng1'du2
覆盆子	fu4'pen2'zi3
干煸	gan1'bian1
干号	gan1'hao2
干急	gan1'ji2
高祖父	gao1'zu3'fu4
宫扇	gong1'shan4
勾绘	gou1'hui4
咕叽	gu1'ji
挂累	gua4'lei3
官风	guan1'feng1
果子酱	guo3'zi3'jiang4
过劳死	guo4'lao2'si3
过堂风	guo4'tang2'feng1
海程	hai3'cheng2
海外奇谈	hai3'wai4'qi2'tan2
函购	han2'gou4
寒症	han2'zheng4
汉姓	han4'xing4
旱道	han4'dao4
悍勇	han4'yong3
焊锡	han4'xi1
禾谷	he2'gu3
贺仪	he4'yi2`;

export const parseContent = (content: string): CourseItem[] => {
  return content
    .trim()
    .split('\n')
    .map(line => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(/\s+/);
      const hanzi = parts[0]?.trim();
      const pinyin = parts[1]?.trim();
      
      if (!hanzi) return null;
      return { 
        hanzi: hanzi, 
        pinyin: pinyin || '' 
      };
    })
    .filter((item): item is CourseItem => item !== null);
};

export const COURSES: Course[] = [
  {
    id: 'course_1',
    name: '练习课程 01',
    items: parseContent(COURSE_1_CONTENT),
    rawContent: COURSE_1_CONTENT
  },
  {
    id: 'course_2',
    name: '练习课程 02',
    items: parseContent(COURSE_2_CONTENT),
    rawContent: COURSE_2_CONTENT
  },
  {
    id: 'course_106',
    name: '练习课程 106',
    items: parseContent(COURSE_106_CONTENT),
    rawContent: COURSE_106_CONTENT
  }
];

export const getCourse = (courseId: string): Course | undefined => {
  return COURSES.find(c => c.id === courseId);
};

/**
 * Attempts to load a list of courses from a manifest.json file in the courses directory.
 * This allows automatic loading of new files without rebuilding the app code, 
 * provided the manifest.json is updated.
 */
export const fetchExternalCourses = async (): Promise<Course[]> => {
  try {
    // 1. Fetch the manifest list (e.g., ["output_part_3.txt", "output_part_4.txt"])
    const manifestRes = await fetch('courses/manifest.json');
    if (!manifestRes.ok) return [];

    const fileList: string[] = await manifestRes.json();
    if (!Array.isArray(fileList)) return [];

    // 2. Fetch each file in parallel
    const coursePromises = fileList.map(async (filename) => {
      try {
        const res = await fetch(`courses/${filename}`);
        if (!res.ok) return null;
        const text = await res.text();
        const items = parseContent(text);
        
        if (items.length === 0) return null;

        // Try to generate a nice name
        let displayName = filename.replace('.txt', '');
        // Extract number if possible for better sorting/display (e.g. output_part_5 -> 练习课程 5)
        const match = displayName.match(/part_(\d+)/);
        if (match) {
            displayName = `练习课程 ${match[1]}`;
        } else {
            // Fallback for other naming conventions
             displayName = displayName.replace(/^output_/, '').replace(/_/g, ' ');
        }

        return {
          id: filename, // Use filename as ID to avoid collision
          name: displayName,
          items,
          rawContent: text
        } as Course;
      } catch (e) {
        console.warn(`Failed to load course file: ${filename}`, e);
        return null;
      }
    });

    const results = await Promise.all(coursePromises);
    
    // Filter out failed loads and sort by number if possible
    const validCourses = results.filter((c): c is Course => c !== null);
    
    // Optional: Sort numerically if they follow the pattern "练习课程 X"
    return validCourses.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

  } catch (error) {
    console.debug('No external courses manifest found (courses/manifest.json). Using built-in courses only.');
    return [];
  }
};
