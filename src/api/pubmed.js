const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Search PubMed for articles matching a query
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results (default 5)
 * @returns {Promise<Array<string>>} Array of PMIDs
 */
export async function searchArticles(query, maxResults = 5) {
  const url = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`PubMed search error: ${response.status}`);
    const data = await response.json();
    return data.esearchresult?.idlist || [];
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}

/**
 * Fetch article summaries (title, authors, journal, date) from PubMed
 * @param {Array<string>} pmids - Array of PubMed IDs
 * @returns {Promise<Array<Object>>} Array of article summary objects
 */
export async function fetchSummaries(pmids) {
  if (!pmids || pmids.length === 0) return [];

  const url = `${EUTILS_BASE}/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`PubMed summary error: ${response.status}`);
    const data = await response.json();

    return pmids.map(pmid => {
      const article = data.result?.[pmid];
      if (!article) return null;
      return {
        pmid,
        title: article.title || '',
        authors: article.authors?.map(a => a.name).join(', ') || '',
        journal: article.fulljournalname || article.source || '',
        pubDate: article.pubdate || '',
        doi: article.elocationid || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('PubMed summary error:', error);
    return [];
  }
}

/**
 * Fetch full abstracts from PubMed
 * @param {Array<string>} pmids - Array of PubMed IDs
 * @returns {Promise<Array<Object>>} Array of objects with pmid and abstract text
 */
export async function fetchAbstracts(pmids) {
  if (!pmids || pmids.length === 0) return [];

  const url = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=xml`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`PubMed fetch error: ${response.status}`);
    const text = await response.text();

    // Parse XML to extract abstracts
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const articles = xml.querySelectorAll('PubmedArticle');

    return Array.from(articles).map(article => {
      const pmid = article.querySelector('PMID')?.textContent || '';
      const title = article.querySelector('ArticleTitle')?.textContent || '';
      const abstractTexts = article.querySelectorAll('AbstractText');
      let abstract = '';

      if (abstractTexts.length > 0) {
        abstract = Array.from(abstractTexts)
          .map(t => {
            const label = t.getAttribute('Label');
            const content = t.textContent;
            return label ? `**${label}**: ${content}` : content;
          })
          .join('\n\n');
      }

      const authors = Array.from(article.querySelectorAll('Author')).map(a => {
        const last = a.querySelector('LastName')?.textContent || '';
        const init = a.querySelector('Initials')?.textContent || '';
        return `${last} ${init}`;
      }).join(', ');

      const journal = article.querySelector('Journal Title')?.textContent ||
        article.querySelector('ISOAbbreviation')?.textContent || '';

      const year = article.querySelector('PubDate Year')?.textContent ||
        article.querySelector('PubDate MedlineDate')?.textContent || '';

      return {
        pmid,
        title,
        abstract,
        authors,
        journal,
        year,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };
    });
  } catch (error) {
    console.error('PubMed abstract fetch error:', error);
    return [];
  }
}

/**
 * Combined search + summary for a disease topic
 * @param {string} diseaseName - Name of the disease
 * @param {string} searchTerms - Optional specific search terms
 * @returns {Promise<Array<Object>>} Array of article summaries
 */
export async function getDiseaseLiterature(diseaseName, searchTerms = null) {
  const query = searchTerms || `${diseaseName} patient education review`;
  const pmids = await searchArticles(query, 8);
  if (pmids.length === 0) return [];

  const [summaries, abstracts] = await Promise.all([
    fetchSummaries(pmids),
    fetchAbstracts(pmids),
  ]);

  // Merge summaries and abstracts
  return summaries.map(summary => {
    const abs = abstracts.find(a => a.pmid === summary.pmid);
    return {
      ...summary,
      abstract: abs?.abstract || '',
    };
  });
}
