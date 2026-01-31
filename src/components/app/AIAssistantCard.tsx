import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Sparkles, Calendar, User, TrendingUp, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BeeIcon } from './BeeIcon';

interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickAction({ label, icon, onClick }: QuickActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-app-muted/50 hover:bg-app-muted 
                 rounded-full text-xs font-medium text-white/80 hover:text-white
                 border border-white/10 hover:border-app-accent/30 transition-colors"
    >
      {icon}
      {label}
    </motion.button>
  );
}

export function AIAssistantCard() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const quickActions = [
    {
      label: "Prossimi eventi",
      icon: <Calendar className="h-3.5 w-3.5 text-app-accent" />,
      action: () => navigate('/app/discover?tab=events'),
    },
    {
      label: "Trova nutrizionista",
      icon: <User className="h-3.5 w-3.5 text-app-accent" />,
      action: () => navigate('/app/discover?tab=professionals'),
    },
    {
      label: "I miei progressi",
      icon: <TrendingUp className="h-3.5 w-3.5 text-app-accent" />,
      action: () => navigate('/app/progress'),
    },
    {
      label: "Parla col PT",
      icon: <MessageCircle className="h-3.5 w-3.5 text-app-accent" />,
      action: () => navigate('/app/chat'),
    },
  ];

  const handleSend = () => {
    if (!message.trim()) return;
    
    // Simulate thinking
    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      // For now, just navigate based on keywords
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('evento') || lowerMessage.includes('eventi')) {
        navigate('/app/discover?tab=events');
      } else if (lowerMessage.includes('nutrizionista') || lowerMessage.includes('professionista')) {
        navigate('/app/discover?tab=professionals');
      } else if (lowerMessage.includes('progress') || lowerMessage.includes('peso')) {
        navigate('/app/progress');
      } else if (lowerMessage.includes('chat') || lowerMessage.includes('pt') || lowerMessage.includes('trainer')) {
        navigate('/app/chat');
      } else if (lowerMessage.includes('allena') || lowerMessage.includes('workout')) {
        navigate('/app/workout');
      } else {
        navigate('/app/discover');
      }
      setMessage('');
    }, 800);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-gradient-to-br from-app-accent/10 via-app-accent/5 to-transparent 
                 rounded-2xl p-4 border border-app-accent/30 
                 shadow-lg shadow-app-accent/5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          animate={isThinking ? { scale: [1, 1.1, 1] } : undefined}
          transition={{ duration: 0.6, repeat: isThinking ? Infinity : 0 }}
        >
          <BeeIcon className="h-12 w-12" animate={!isThinking} />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white">BeeBot</h3>
            <Sparkles className="h-4 w-4 text-app-accent" />
          </div>
          <p className="text-xs text-app-muted-foreground">Il tuo assistente AI</p>
        </div>
        {isThinking && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-xs text-app-accent"
          >
            Sto pensando...
          </motion.div>
        )}
      </div>

      {/* Welcome Message */}
      <p className="text-sm text-white/70 mb-4 leading-relaxed">
        Ciao! 👋 Posso aiutarti con info su allenamenti, eventi, professionisti e molto altro. 
        Cosa vuoi sapere?
      </p>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickActions.map((action) => (
          <QuickAction
            key={action.label}
            label={action.label}
            icon={action.icon}
            onClick={action.action}
          />
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Chiedi qualcosa..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isThinking}
          className="flex-1 bg-app-muted/60 border-white/10 rounded-full 
                     placeholder:text-white/30 text-white text-sm
                     focus-visible:ring-app-accent/50"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || isThinking}
          className="bg-app-accent hover:bg-app-accent/90 text-black rounded-full 
                     h-10 w-10 shrink-0 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default AIAssistantCard;
