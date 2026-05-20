export interface Step {
  id: string;
  number: string;
  title: string;
  description: string;
  formulas: { tex: string; label?: string }[];
  notes?: string;
  highlight?: boolean;
}

export interface Section {
  id: string;
  roman: string;
  title: string;
  badge?: string;
  color: string;
  steps: Step[];
}

export const sections: Section[] = [
  {
    id: "log-returns",
    roman: "I",
    title: "Расчёт лог-ретёрнов активов",
    badge: "Входные данные",
    color: "from-blue-500/20 to-indigo-500/20",
    steps: [
      {
        id: "log-ret",
        number: "0",
        title: "Лог-ретёрны",
        description: "Вычисляем логарифмическую доходность каждого актива i в момент времени t.",
        formulas: [
          { tex: "r_{i,t} = \\ln\\!\\left(\\frac{S_{i,t}}{S_{i,t-1}}\\right)", label: "где i — актив, t — момент времени" },
        ],
      },
    ],
  },
  {
    id: "hrp",
    roman: "II",
    title: "Построение HRP",
    badge: "Hierarchical Risk Parity",
    color: "from-violet-500/20 to-purple-500/20",
    steps: [
      {
        id: "cov-corr",
        number: "1",
        title: "Ковариационная и корреляционная матрицы",
        description: "Вектор доходностей N активов. Каждый компонент rᵢ — случайная величина с мат. ожиданием μᵢ и стандартным отклонением σᵢ.",
        formulas: [
          { tex: "\\Sigma_{i,j} = Cov(r_i, r_j)" },
          { tex: "C_{i,j} = \\rho_{i,j} = \\frac{Cov(r_i, r_j)}{\\sigma_i \\sigma_j}" },
        ],
      },
      {
        id: "dist-matrix",
        number: "2",
        title: "Матрица расстояний по корреляции D",
        description: "Чем ближе корреляция к 1, тем ближе расстояние к 0 — активы окажутся в одном кластере.",
        formulas: [
          { tex: "d_{i,j} = \\sqrt{\\frac{1 - \\rho_{i,j}}{2}}" },
        ],
      },
      {
        id: "dendrogram",
        number: "3",
        title: "Строим дендрограмму",
        description: "Используем метод average linkage для построения иерархической кластеризации.",
        formulas: [],
      },
      {
        id: "silhouette",
        number: "4",
        title: "Оптимальное количество кластеров",
        description: "Разрезаем дендрограмму на k кластеров (от 2 до 10). Используем fcluster из SciPy и коэффициент силуэта.",
        formulas: [
          { tex: "s_i = \\frac{b_i - a_i}{\\max(b_i, a_i)}" },
          { tex: "a_i = \\frac{1}{|C_I| - 1} \\sum_{\\substack{j \\in C_I \\\\ j \\neq i}} d_{i,j}", label: "внутрикластерное расстояние" },
          { tex: "b_i = \\min\\!\\left(M(i, C_J)\\right),\\; J \\neq I", label: "межкластерное расстояние" },
        ],
        notes: "sᵢ ≈ 1 — идеально; sᵢ ≈ 0 — пограничное; sᵢ ≈ −1 — ошибка",
      },
      {
        id: "leaf-order",
        number: "5",
        title: "Leaf order из дендрограммы",
        description: "Получаем упорядоченный список активов через функцию leaves_list из scipy.",
        formulas: [
          { tex: "\\pi = (\\pi_1, \\ldots, \\pi_N)" },
        ],
      },
      {
        id: "quasi-diag",
        number: "6",
        title: "Квазидиагонализация матрицы Σ",
        description: "Перестановка строк и столбцов исходной Σ в соответствии с порядком π.",
        formulas: [
          { tex: "\\Sigma^{q}_{i,j} = \\Sigma_{\\pi_i, \\pi_j}" },
        ],
      },
      {
        id: "recursive-weights",
        number: "7",
        title: "Рекурсивное назначение весов",
        description: "Для каждого внутреннего узла дерева определяем веса обратно пропорционально дисперсии.",
        formulas: [
          { tex: "\\sigma_L^2 = v_L^T \\Sigma_L \\, v_L, \\quad v_L = \\frac{1}{m_L} I_{m_L}" },
          { tex: "w_L = \\frac{1/\\sigma_L^2}{\\frac{1}{\\sigma_L^2} + \\frac{1}{\\sigma_R^2}}, \\quad w_R = 1 - w_L" },
        ],
      },
    ],
  },
  {
    id: "long-short",
    roman: "III",
    title: "Разбиваем на LONG и SHORT",
    badge: "Портфель",
    color: "from-emerald-500/20 to-teal-500/20",
    steps: [
      {
        id: "subportfolios",
        number: "1",
        title: "Два подпортфеля",
        description: "Создаём long и short подпортфели на основе сигналов buy/sell от агента. Сумма весов в каждом = 1.",
        formulas: [],
      },
      {
        id: "confidence",
        number: "2",
        title: "Confidence и доли риска",
        description: "Если агент выдаёт confidence (p), рассчитываем доли риска и поправочные коэффициенты.",
        formulas: [
          { tex: "\\lambda_L = \\frac{\\xi_L}{\\xi_L + \\xi_S}, \\quad \\lambda_S = \\frac{\\xi_S}{\\xi_L + \\xi_S}" },
          { tex: "\\alpha_L = \\frac{\\sqrt{\\lambda_L}}{\\sigma_L}, \\quad \\alpha_S = \\frac{\\sqrt{\\lambda_S}}{\\sigma_S}" },
        ],
        highlight: true,
        notes: "⚠️ Нужен ли этот шаг?? (пометка из оригинала)",
      },
    ],
  },
  {
    id: "cvar",
    roman: "IV",
    title: "Коррекция через CVaR",
    badge: "Халла–Уайта",
    color: "from-cyan-500/20 to-blue-500/20",
    steps: [
      {
        id: "portfolio-return",
        number: "1",
        title: "Доходность портфеля",
        description: "Итоговая доходность LONG/SHORT портфеля.",
        formulas: [
          { tex: "r_{p,t} = \\sum_{i=1}^{n} w_i r_{i,t}" },
        ],
      },
      {
        id: "ewma",
        number: "2",
        title: "Условная волатильность (EWMA)",
        description: "Оценка волатильности экспоненциально взвешенным скользящим средним.",
        formulas: [
          { tex: "\\sigma_{p,t}^2 = \\lambda \\sigma_{p,t-1}^2 + (1 - \\lambda) r_{p,t-1}^2, \\quad \\lambda = 0.94" },
        ],
      },
      {
        id: "hull-white",
        number: "3",
        title: "Скорректированные доходности",
        description: "Метод Халла–Уайта масштабирует прошлые доходности к текущему уровню волатильности.",
        formulas: [
          { tex: "\\widetilde{r}_{p,s} = \\frac{\\sigma_{p,t+1}}{\\sigma_{p,s}} r_{p,s}" },
        ],
      },
      {
        id: "var-cvar",
        number: "4–5",
        title: "VaR и CVaR",
        description: "Квантиль убытков и средний убыток в хвосте распределения.",
        formulas: [
          { tex: "VaR_\\alpha^{HW} = -q_{1-\\alpha}(\\widetilde{r}_p)" },
          { tex: "CVaR_\\alpha^{HW} = -\\mathbb{E}\\left[\\widetilde{r}_p \\mid \\widetilde{r}_p \\leq q_{1-\\alpha}(\\widetilde{r}_p)\\right]" },
        ],
      },
      {
        id: "risk-check",
        number: "6–7",
        title: "Проверка риска и cash",
        description: "Если CVaR превышает допустимый порог — уменьшаем позиции, остаток переводим в cash.",
        formulas: [
          { tex: "w_i^{new} = \\gamma w_i, \\quad \\gamma = \\frac{CVaR_{\\max}}{CVaR_\\alpha^{HW}}" },
          { tex: "w_{cash} = 1 - \\sum_{i=1}^{n} |w_i^{new}|" },
        ],
      },
    ],
  },
];
