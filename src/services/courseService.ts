
import type { Course, CourseItem } from '../types';

/**
 * Parses the traditional TXT format:
 * Hanzi[Tab/Space]Pinyin
 */
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

// Initial empty array. Courses will be populated via fetchExternalCourses
export const COURSES: Course[] = [];

export const getCourse = (courseId: string): Course | undefined => {
  return COURSES.find(c => c.id === courseId);
};

/**
 * Attempts to load a list of courses from a manifest.json file in the courses directory.
 * Supports both .txt (line-based) and .json (structured) files.
 */
export const fetchExternalCourses = async (): Promise<Course[]> => {
  try {
    const manifestRes = await fetch('courses/manifest.json');
    if (!manifestRes.ok) return [];

    const fileList: string[] = await manifestRes.json();
    if (!Array.isArray(fileList)) return [];

    const coursePromises = fileList.map(async (filename) => {
      try {
        const res = await fetch(`courses/${filename}`);
        if (!res.ok) return null;

        let items: CourseItem[] = [];
        let rawContent = "";

        if (filename.endsWith('.json')) {
          // If JSON, we expect an array of {hanzi: string, pinyin: string}
          // OR a direct array of objects.
          const jsonData = await res.json();
          rawContent = JSON.stringify(jsonData);
          items = Array.isArray(jsonData) ? jsonData : (jsonData.items || []);
        } else {
          // Fallback to traditional TXT parsing
          rawContent = await res.text();
          items = parseContent(rawContent);
        }
        
        if (items.length === 0) return null;

        let displayName = filename.replace(/\.(txt|json)$/, '');
        const match = displayName.match(/part_(\d+)/);
        if (match) {
            displayName = `练习课程 ${match[1]}`;
        } else {
             displayName = displayName.replace(/^output_/, '').replace(/_/g, ' ');
        }

        return {
          id: filename,
          name: displayName,
          items,
          rawContent
        } as Course;
      } catch (e) {
        console.warn(`Failed to load course file: ${filename}`, e);
        return null;
      }
    });

    const results = await Promise.all(coursePromises);
    const validCourses = results.filter((c): c is Course => c !== null);
    
    return validCourses.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
    });

  } catch (error) {
    console.debug('No external courses manifest found.');
    return [];
  }
};
